"""Chat models for WebSocket communication."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Types of messages in the chat system."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    ERROR = "error"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    TYPING = "typing"
    STREAM_START = "stream_start"
    STREAM_DELTA = "stream_delta"
    STREAM_END = "stream_end"


class IncomingMessage(BaseModel):
    """Message received from client via WebSocket."""
    type: str = Field(default="user", description="Message type")
    content: Optional[str] = Field(None, description="Message content")
    token: Optional[str] = Field(None, description="Access token for authentication")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class OutgoingMessage(BaseModel):
    """Message sent to client via WebSocket."""
    type: str = Field(description="Message type")
    message_id: str = Field(description="Unique message identifier")
    content: Optional[Dict[str, Any]] = Field(None, description="Message content as JSON schema")
    delta: Optional[str] = Field(None, description="Stream delta content")
    complete: Optional[bool] = Field(None, description="Whether stream is complete")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ErrorMessage(BaseModel):
    """Error message sent to client."""
    type: str = Field(default=MessageType.ERROR, description="Message type")
    error: str = Field(description="Error type")
    detail: str = Field(description="Error details")
    code: int = Field(description="Error code")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    should_reconnect: bool = Field(default=False, description="Whether client should attempt reconnect")
    redirect_to: Optional[str] = Field(None, description="URL to redirect to (e.g., login)")


class ConnectionResponse(BaseModel):
    """Response sent on successful connection."""
    type: str = Field(default=MessageType.CONNECTED, description="Message type")
    user_id: str = Field(description="Connected user ID")
    session_id: str = Field(description="Chat session ID")
    message: str = Field(default="Connected to chatroom")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

