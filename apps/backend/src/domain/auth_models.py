"""Authentication domain models for request and response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Request Models
class SignupRequest(BaseModel):
    """Request model for user signup."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=64,
        description="User password (8-64 characters)"
    )
    full_name: Optional[str] = Field(
        None,
        max_length=255,
        description="User's full name"
    )


class LoginRequest(BaseModel):
    """Request model for user login."""
    
    model_config = ConfigDict(str_strip_whitespace=True)
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class RefreshTokenRequest(BaseModel):
    """Request model for refreshing access token."""
    
    refresh_token: str = Field(..., description="Refresh token")


# Response Models
class UserResponse(BaseModel):
    """Response model for user information."""
    
    id: str = Field(..., description="User unique identifier")
    email: str = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, description="User's full name")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class AuthTokens(BaseModel):
    """Response model for authentication tokens."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    expires_at: Optional[int] = Field(None, description="Token expiration timestamp")


class AuthResponse(BaseModel):
    """Complete authentication response with user and tokens."""
    
    user: UserResponse = Field(..., description="Authenticated user information")
    tokens: AuthTokens = Field(..., description="Authentication tokens")


class MessageResponse(BaseModel):
    """Generic message response."""
    
    message: str = Field(..., description="Response message")

