"""Chat service for handling WebSocket chat operations."""

import logging
import uuid
from typing import AsyncGenerator, Optional

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
        
    def generate_message_id(self) -> str:
        """Generate unique message ID for this session."""
        self.message_count += 1
        return f"{self.session_id}-{self.message_count}"


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
) -> AsyncGenerator[OutgoingMessage, None]:
    """
    Process a user message and generate AI response.
    
    This function will integrate with the agentic RAG service to provide
    personalized responses based on user history and context.
    
    Args:
        message: Incoming user message
        session: Current chat session
        supabase: Supabase client instance
        
    Yields:
        OutgoingMessage instances (streaming response)
    """
    try:
        # Generate unique message ID
        message_id = session.generate_message_id()
        
        # Send stream start
        yield OutgoingMessage(
            type=MessageType.STREAM_START,
            message_id=message_id,
            metadata={"user_id": session.user.id}
        )
        
        # TODO: Integrate with agentic RAG service here
        # For now, echo back the message as a simple response
        # In production, this would call the RAG service with:
        # - user_id: session.user.id
        # - message: message.content
        # - conversation_context: from metadata
        
        # Simulate streaming response
        if message.content:
            response_text = f"Received your message: {message.content}"
            
            # Stream the response in chunks
            chunk_size = 10
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i + chunk_size]
                yield OutgoingMessage(
                    type=MessageType.STREAM_DELTA,
                    message_id=message_id,
                    delta=chunk,
                    complete=False
                )
        
        # Send stream end
        yield OutgoingMessage(
            type=MessageType.STREAM_END,
            message_id=message_id,
            complete=True,
            content=response_text if message.content else "No content provided",
            metadata={
                "user_id": session.user.id,
                "processed": True
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        yield OutgoingMessage(
            type=MessageType.ERROR,
            message_id=session.generate_message_id(),
            content=f"Failed to process message: {str(e)}"
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
            await websocket.send_json(error_msg.model_dump())
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
        await websocket.send_json(connection_msg.model_dump())
        
        logger.info(f"User {user.id} connected to chat session {session_id}")
        return session
        
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        error_msg = await create_error_message(
            error_type="connection_failed",
            detail=f"Failed to establish connection: {str(e)}",
            code=status.WS_1011_INTERNAL_ERROR
        )
        await websocket.send_json(error_msg.model_dump())
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
                await websocket.send_json(error_msg.model_dump())
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
                await websocket.send_json(error_msg.model_dump())
                return False
        
        # Process message based on type
        if message.type == MessageType.USER or message.type == "user":
            # Process user message and stream response
            async for response in process_user_message(message, session, supabase):
                await websocket.send_json(response.model_dump())
        
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
        await websocket.send_json(error_msg.model_dump())
        return True  # Continue connection despite error
