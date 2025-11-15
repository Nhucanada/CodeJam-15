"""Authentication service for handling user auth operations."""

from typing import Optional

from fastapi import HTTPException, status
from supabase import Client

from src.domain.auth_models import (
    AuthResponse,
    AuthTokens,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    SignupRequest,
    UserResponse,
)


def _format_user_response(user_data: dict) -> UserResponse:
    """Format Supabase user data into UserResponse model."""
    return UserResponse(
        id=user_data.get("id"),
        email=user_data.get("email"),
        full_name=user_data.get("user_metadata", {}).get("full_name"),
        created_at=user_data.get("created_at"),
        updated_at=user_data.get("updated_at")
    )


def _format_auth_tokens(session_data: dict) -> AuthTokens:
    """Format Supabase session data into AuthTokens model."""
    return AuthTokens(
        access_token=session_data.get("access_token"),
        refresh_token=session_data.get("refresh_token"),
        token_type=session_data.get("token_type", "bearer"),
        expires_in=session_data.get("expires_in"),
        expires_at=session_data.get("expires_at")
    )


async def signup_user(
    signup_data: SignupRequest,
    supabase: Client
) -> AuthResponse:
    """
    Register a new user with email and password.
    
    Args:
        signup_data: User signup information
        supabase: Supabase client instance
        
    Returns:
        AuthResponse with user info and tokens
        
    Raises:
        HTTPException: If signup fails
    """
    try:
        # Prepare user metadata
        user_metadata = {}
        if signup_data.full_name:
            user_metadata["full_name"] = signup_data.full_name

        import logging
        logging.debug(f"[auth_service.signup_user] Signup data: email={signup_data.email}, full_name={signup_data.full_name}")
        
        # Sign up user
        response = supabase.auth.sign_up({
            "email": signup_data.email,
            "password": signup_data.password,
            "options": {"data": user_metadata} if user_metadata else {}
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )
        
        return AuthResponse(
            user=_format_user_response(response.user.model_dump()),
            tokens=_format_auth_tokens(response.session.model_dump())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )


async def login_user(
    login_data: LoginRequest,
    supabase: Client
) -> AuthResponse:
    """
    Authenticate user with email and password.
    
    Args:
        login_data: User login credentials
        supabase: Supabase client instance
        
    Returns:
        AuthResponse with user info and tokens
        
    Raises:
        HTTPException: If login fails
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        return AuthResponse(
            user=_format_user_response(response.user.model_dump()),
            tokens=_format_auth_tokens(response.session.model_dump())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


async def logout_user(
    access_token: str,
    supabase: Client
) -> MessageResponse:
    """
    Logout user by invalidating their session.
    
    Args:
        access_token: User's access token
        supabase: Supabase client instance
        
    Returns:
        MessageResponse confirming logout
        
    Raises:
        HTTPException: If logout fails
    """
    try:
        # Set the session for this client instance
        supabase.auth.set_session(access_token, refresh_token="")
        
        # Sign out
        supabase.auth.sign_out()
        
        return MessageResponse(message="Successfully logged out")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}"
        )


async def refresh_access_token(
    refresh_data: RefreshTokenRequest,
    supabase: Client
) -> AuthTokens:
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_data: Refresh token information
        supabase: Supabase client instance
        
    Returns:
        New AuthTokens
        
    Raises:
        HTTPException: If token refresh fails
    """
    try:
        response = supabase.auth.refresh_session(refresh_data.refresh_token)
        
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        return _format_auth_tokens(response.session.model_dump())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )


async def get_current_user_info(
    access_token: str,
    supabase: Client
) -> UserResponse:
    """
    Get current authenticated user information.
    
    Args:
        access_token: User's access token
        supabase: Supabase client instance
        
    Returns:
        UserResponse with current user info
        
    Raises:
        HTTPException: If user retrieval fails
    """
    try:
        # Set the session
        supabase.auth.set_session(access_token, refresh_token="")
        
        # Get user
        response = supabase.auth.get_user(access_token)
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return _format_user_response(response.user.model_dump())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to get user info: {str(e)}"
        )


def verify_access_token(
    access_token: str,
    supabase: Client
) -> Optional[dict]:
    """
    Verify and decode access token.
    
    Args:
        access_token: JWT access token
        supabase: Supabase client instance
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        response = supabase.auth.get_user(access_token)
        if response.user:
            return response.user.model_dump()
        return None
    except Exception:
        return None

