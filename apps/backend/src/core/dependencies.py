"""FastAPI dependencies for authentication and authorization."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.domain.auth_models import UserResponse
from src.infra.supabase_client import get_supabase_client
from src.services.auth_service import get_current_user_info

# Security scheme for Bearer token
security = HTTPBearer(
    scheme_name="Bearer",
    description="Enter your JWT access token",
    auto_error=False
)


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security)
    ]
) -> UserResponse:
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        UserResponse with current user information
        
    Raises:
        HTTPException: If authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    supabase = get_supabase_client()
    access_token = credentials.credentials
    
    try:
        user = await get_current_user_info(access_token, supabase)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_optional_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(security)
    ]
) -> UserResponse | None:
    """
    Dependency to optionally get current user (doesn't fail if not authenticated).
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        UserResponse if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        supabase = get_supabase_client()
        user = await get_current_user_info(credentials.credentials, supabase)
        return user
    except Exception:
        return None


# Type aliases for dependency injection
CurrentUser = Annotated[UserResponse, Depends(get_current_user)]
OptionalUser = Annotated[UserResponse | None, Depends(get_optional_user)]

