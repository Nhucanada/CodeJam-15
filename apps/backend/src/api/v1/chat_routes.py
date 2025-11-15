"""Chat WebSocket API routes."""

import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from src.domain.chat_models import ErrorMessage, MessageType
from src.infra.supabase_client import get_supabase_client
from src.services.chat_service import (
    create_error_message,
    handle_chat_connection,
    handle_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, token: Optional[str] = None):
    """
    WebSocket endpoint for real-time chat.
    
    Connection requires authentication via query parameter:
    - token: JWT access token
    
    Example connection: ws://localhost:8000/api/v1/chat/ws?token=<access_token>
    
    Message Format (Client -> Server):
    {
        "type": "user",           # Message type (user, typing)
        "content": "Hello!",      # Message content
        "token": "optional",      # Optional: refresh token for re-auth
        "metadata": {}            # Optional: additional data
    }
    
    Message Format (Server -> Client):
    {
        "type": "stream_delta",   # Message type (connected, stream_start, stream_delta, stream_end, error)
        "message_id": "uuid",     # Unique message identifier
        "content": "text",        # Full content (on stream_end)
        "delta": "text chunk",    # Partial content (on stream_delta)
        "complete": true/false,   # Whether stream is complete
        "timestamp": "ISO date",  # Message timestamp
        "metadata": {}            # Additional data
    }
    
    Error Response:
    {
        "type": "error",
        "error": "authentication_failed",
        "detail": "Error details",
        "code": 1008,
        "should_reconnect": false,
        "redirect_to": "/login"
    }
    
    Authentication:
    - Initial connection requires valid access token in query params
    - Each message can optionally include a token for re-authentication
    - If authentication fails at any point, connection is terminated with error
    - Client should redirect to login if redirect_to is provided in error
    
    Args:
        websocket: WebSocket connection
        token: JWT access token from query params
    """
    # Accept connection first (required before sending any messages)
    await websocket.accept()
    
    supabase = get_supabase_client()
    session = None
    
    try:
        # Validate token is provided
        if not token:
            error_msg = await create_error_message(
                error_type="missing_token",
                detail="Authentication token is required. Connect with ?token=<access_token>",
                code=status.WS_1008_POLICY_VIOLATION,
                should_reconnect=False,
                redirect_to="/login"
            )
            await websocket.send_json(error_msg.model_dump())
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Handle initial connection and authentication
        session = await handle_chat_connection(websocket, token, supabase)
        
        if not session:
            # Connection failed, already handled in handle_chat_connection
            return
        
        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_json()
                
                # Handle the message
                should_continue = await handle_message(
                    message_data=data,
                    session=session,
                    websocket=websocket,
                    supabase=supabase
                )
                
                if not should_continue:
                    # Authentication failed or connection should close
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                    break
                    
            except WebSocketDisconnect:
                logger.info(f"Client disconnected from session {session.session_id}")
                break
                
            except ValueError as e:
                # Invalid JSON or message format
                error_msg = await create_error_message(
                    error_type="invalid_message_format",
                    detail=f"Invalid message format: {str(e)}",
                    code=status.WS_1003_UNSUPPORTED_DATA
                )
                await websocket.send_json(error_msg.model_dump())
                
            except Exception as e:
                logger.error(f"Unexpected error in message loop: {str(e)}")
                error_msg = await create_error_message(
                    error_type="internal_error",
                    detail="An unexpected error occurred",
                    code=status.WS_1011_INTERNAL_ERROR
                )
                await websocket.send_json(error_msg.model_dump())
                
    except WebSocketDisconnect:
        logger.info("Client disconnected during connection setup")
        
    except Exception as e:
        logger.error(f"Fatal error in WebSocket handler: {str(e)}")
        try:
            error_msg = await create_error_message(
                error_type="connection_error",
                detail="Fatal connection error",
                code=status.WS_1011_INTERNAL_ERROR
            )
            await websocket.send_json(error_msg.model_dump())
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            # Connection may already be closed
            pass
    
    finally:
        # Cleanup
        if session:
            logger.info(f"Session {session.session_id} ended for user {session.user.id}")


@router.get(
    "/health",
    summary="Chat service health check",
    description="Check if chat WebSocket service is available"
)
async def chat_health():
    """
    Health check endpoint for chat service.
    
    Returns:
        Status message indicating service health
    """
    return {
        "status": "healthy",
        "service": "chat_websocket",
        "endpoint": "/api/v1/chat/ws"
    }

