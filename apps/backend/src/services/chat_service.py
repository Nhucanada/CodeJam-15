"""Chat service for handling WebSocket chat operations."""

import logging
import uuid
from typing import Optional

from fastapi import WebSocket, status
from supabase import Client

from src.domain.auth_models import UserResponse
from src.domain.chat_models import (
    ConnectionResponse,
    ErrorMessage,
    IncomingMessage,
    MessageType,
    OutgoingMessage,
)
from src.services.auth_service import verify_access_token

logger = logging.getLogger(__name__)


class ChatSession:
    """Manages a single chat session for a user."""
    
    def __init__(self, user: UserResponse, session_id: str):
        self.user = user
        self.session_id = session_id
        self.message_count = 0
        self.conversation_history: list[str] = []
        
    def generate_message_id(self) -> str:
        """Generate unique message ID for this session."""
        self.message_count += 1
        return f"{self.session_id}-{self.message_count}"
    
    def add_to_history(self, role: str, content: str) -> None:
        """
        Add a message to conversation history.
        
        Args:
            role: Message role (user, assistant, system)
            content: Message content
        """
        self.conversation_history.append(f"[{role.upper()}]: {content}")
    
    def get_context_string(self, max_messages: int = 10) -> str:
        """
        Get recent conversation context as a formatted string.
        
        Args:
            max_messages: Maximum number of recent messages to include
            
        Returns:
            Formatted conversation context
        """
        if not self.conversation_history:
            return ""
        
        recent = self.conversation_history[-max_messages:]
        return "\n".join(recent)


async def authenticate_message(
    token: str,
    supabase: Client
) -> Optional[UserResponse]:
    """
    Authenticate a message using the provided token.
    
    Args:
        token: Access token to verify
        supabase: Supabase client instance
        
    Returns:
        UserResponse if authenticated, None otherwise
    """
    try:
        user_data = verify_access_token(token, supabase)
        if not user_data:
            return None
            
        from src.services.auth_service import _format_user_response
        return _format_user_response(user_data)
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        return None


async def create_error_message(
    error_type: str,
    detail: str,
    code: int = status.WS_1008_POLICY_VIOLATION,
    should_reconnect: bool = False,
    redirect_to: Optional[str] = None
) -> ErrorMessage:
    """
    Create an error message to send to client.
    
    Args:
        error_type: Type of error
        detail: Error details
        code: Error code
        should_reconnect: Whether client should attempt reconnect
        redirect_to: URL to redirect to
        
    Returns:
        ErrorMessage instance
    """
    return ErrorMessage(
        error=error_type,
        detail=detail,
        code=code,
        should_reconnect=should_reconnect,
        redirect_to=redirect_to
    )


async def process_user_message(
    message: IncomingMessage,
    session: ChatSession,
    supabase: Client
) -> OutgoingMessage:
    """
    Process a user message and generate AI response using AgenticEngine.
    
    This function integrates with the agentic RAG service to provide
    personalized responses based on user history and context.
    
    Args:
        message: Incoming user message
        session: Current chat session
        supabase: Supabase client instance
        
    Returns:
        OutgoingMessage with the complete response
    """
    try:
        from src.infra.agent_core.factory import get_agentic_engine
        
        # Generate unique message ID
        message_id = session.generate_message_id()
        
        # Add user message to history
        if message.content:
            session.add_to_history("user", message.content)
        
        # Get conversation context
        context = session.get_context_string(max_messages=10)
        
        # Prepare enhanced input with context
        user_input = message.content or ""
        if context:
            enhanced_input = f"[CONVERSATION CONTEXT]\n{context}\n\n[CURRENT MESSAGE]\n{user_input}"
        else:
            enhanced_input = user_input
        
        # Get the singleton AgenticEngine
        engine = get_agentic_engine()
        
        # Run the agent with RAG
        result = await engine.run(
            user_input=enhanced_input,
            user_id=session.user.id,
            top_k=5,
            rag_enabled=True
        )

        # print(result)
        logger.info(result)
        
        # Extract the completion as dict/JSON object
        completion = result.get("completion", {})
        
        # print(completion)
        logger.info(completion)
        
        # Add assistant response to history (use conversation field for text history)
        conversation_text = completion.get("conversation", "") if isinstance(completion, dict) else str(completion)
        session.add_to_history("assistant", conversation_text)
        
        # Return complete response with metadata
        return OutgoingMessage(
            type=MessageType.ASSISTANT,
            message_id=message_id,
            complete=True,
            content=completion,
            metadata={
                "user_id": session.user.id,
                "session_id": session.session_id,
                "template_used": result.get("template_name", ""),
                "retrieved_count": len(result.get("retrieved_chunks", [])),
                "conversation_length": len(session.conversation_history)
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}", exc_info=True)
        
        # Add error to history for context
        error_msg = f"I encountered an error processing your request: {str(e)}"
        session.add_to_history("system", f"Error: {str(e)}")
        
        return OutgoingMessage(
            type=MessageType.ERROR,
            message_id=session.generate_message_id(),
            content={
                "error": str(e),
                "conversation": error_msg,
                "action_type": None
            }
        )


async def handle_chat_connection(
    websocket: WebSocket,
    initial_token: str,
    supabase: Client
) -> Optional[ChatSession]:
    """
    Handle initial WebSocket connection and authentication.
    
    Args:
        websocket: WebSocket connection
        initial_token: Access token from query params
        supabase: Supabase client instance
        
    Returns:
        ChatSession if authenticated, None otherwise
    """
    try:
        # Authenticate user
        user = await authenticate_message(initial_token, supabase)
        
        if not user:
            error_msg = await create_error_message(
                error_type="authentication_failed",
                detail="Invalid or expired authentication token",
                code=status.WS_1008_POLICY_VIOLATION,
                should_reconnect=False,
                redirect_to="/login"
            )
            await websocket.send_json(error_msg.model_dump(mode='json'))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        
        # Create session
        session_id = str(uuid.uuid4())
        session = ChatSession(user=user, session_id=session_id)
        
        # Send connection confirmation
        connection_msg = ConnectionResponse(
            user_id=user.id,
            session_id=session_id
        )
        await websocket.send_json(connection_msg.model_dump(mode='json'))
        
        logger.info(f"User {user.id} connected to chat session {session_id}")
        return session
        
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        error_msg = await create_error_message(
            error_type="connection_failed",
            detail=f"Failed to establish connection: {str(e)}",
            code=status.WS_1011_INTERNAL_ERROR
        )
        await websocket.send_json(error_msg.model_dump(mode='json'))
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return None


async def handle_message(
    message_data: dict,
    session: ChatSession,
    websocket: WebSocket,
    supabase: Client
) -> bool:
    """
    Handle incoming message from client.
    
    Args:
        message_data: Raw message data from client
        session: Current chat session
        websocket: WebSocket connection
        supabase: Supabase client instance
        
    Returns:
        True if connection should continue, False if it should close
    """
    try:
        # Parse incoming message
        message = IncomingMessage(**message_data)
        
        # Re-authenticate if token is provided in message
        if message.token:
            user = await authenticate_message(message.token, supabase)
            if not user:
                error_msg = await create_error_message(
                    error_type="authentication_expired",
                    detail="Your session has expired. Please log in again.",
                    code=status.WS_1008_POLICY_VIOLATION,
                    should_reconnect=False,
                    redirect_to="/login"
                )
                await websocket.send_json(error_msg.model_dump(mode='json'))
                return False
            
            # Verify it's the same user
            if user.id != session.user.id:
                error_msg = await create_error_message(
                    error_type="authentication_mismatch",
                    detail="User identity mismatch. Connection terminated.",
                    code=status.WS_1008_POLICY_VIOLATION,
                    should_reconnect=False,
                    redirect_to="/login"
                )
                await websocket.send_json(error_msg.model_dump(mode='json'))
                return False
        
        # Process message based on type
        if message.type == MessageType.USER or message.type == "user":
            # Process user message and send response
            response = await process_user_message(message, session, supabase)
            await websocket.send_json(response.model_dump(mode='json'))
        
        elif message.type == MessageType.TYPING:
            # Handle typing indicator (could broadcast to other participants)
            pass
        
        else:
            logger.warning(f"Unknown message type: {message.type}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}")
        error_msg = await create_error_message(
            error_type="message_processing_failed",
            detail=f"Failed to process message: {str(e)}",
            code=status.WS_1011_INTERNAL_ERROR
        )
        await websocket.send_json(error_msg.model_dump(mode='json'))
        return True  # Continue connection despite error
