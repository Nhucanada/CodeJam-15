"""Authentication API routes."""

from typing import Annotated, Union

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.dependencies import CurrentUser, security
from src.domain.auth_models import (
    AuthResponse,
    AuthTokens,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    SignupRedirectResponse,
    SignupRequest,
    UserResponse,
)
from src.infra.supabase_client import get_supabase_client
from src.services.auth_service import (
    get_current_user_info,
    login_user,
    logout_user,
    refresh_access_token,
    signup_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=Union[AuthResponse, SignupRedirectResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with email and password"
)
async def signup(signup_data: SignupRequest) -> Union[AuthResponse, SignupRedirectResponse]:
    """
    Register a new user.
    
    Args:
        signup_data: User registration information
        
    Returns:
        AuthResponse with user info and access tokens if signup is complete,
        or SignupRedirectResponse if email confirmation is required
    """
    supabase = get_supabase_client()
    return await signup_user(signup_data, supabase)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticate user with email and password"
)
async def login(login_data: LoginRequest) -> AuthResponse:
    """
    Authenticate user and return tokens.
    
    Args:
        login_data: User login credentials
        
    Returns:
        AuthResponse with user info and access tokens
    """
    supabase = get_supabase_client()
    return await login_user(login_data, supabase)


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="User logout",
    description="Invalidate user session and logout"
)
async def logout(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security)
    ]
) -> MessageResponse:
    """
    Logout current user.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        MessageResponse confirming logout
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    supabase = get_supabase_client()
    return await logout_user(credentials.credentials, supabase)


@router.post(
    "/refresh",
    response_model=AuthTokens,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Get new access token using refresh token"
)
async def refresh_token(refresh_data: RefreshTokenRequest) -> AuthTokens:
    """
    Refresh access token.
    
    Args:
        refresh_data: Refresh token information
        
    Returns:
        New AuthTokens
    """
    supabase = get_supabase_client()
    return await refresh_access_token(refresh_data, supabase)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Get authenticated user information"
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        UserResponse with current user info
    """
    return current_user


@router.get(
    "/health",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Auth health check",
    description="Check authentication service health"
)
async def auth_health() -> MessageResponse:
    """
    Health check endpoint for authentication service.
    
    Returns:
        MessageResponse indicating service is healthy
    """
    return MessageResponse(message="Authentication service is healthy")

