"""Cocktail management API routes."""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from src.core.dependencies import get_current_user, get_supabase_client
from src.domain.auth_models import UserResponse
from src.domain.cocktail_models import (
    CocktailDetail,
    CocktailResponse,
    CocktailSummary,
    CreateCocktailRequest,
    UserShelfResponse
)
from src.infra.cocktail_repo import CocktailRepository
from supabase import Client as SupabaseClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cocktails", tags=["Cocktails"])


@router.get(
    "/shelf",
    response_model=UserShelfResponse,
    summary="Get user's cocktail shelf",
    description="Retrieve all cocktails associated with the authenticated user for shelf display"
)
async def get_user_shelf(
    current_user: UserResponse = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client)
) -> UserShelfResponse:
    """
    Get user's cocktail shelf with ingredient summaries.
    
    Returns:
        UserShelfResponse: User's cocktails with agent greeting
    """
    try:
        cocktail_repo = CocktailRepository(supabase)
        cocktails = await cocktail_repo.get_user_cocktails(current_user.id)

        # Generate personalized greeting based on cocktail count
        if len(cocktails) == 0:
            greeting = "Welcome! Ready to create your first cocktail?"
        elif len(cocktails) == 1:
            greeting = "Welcome back! You have one cocktail in your collection."
        else:
            greeting = f"Welcome back! You have {len(cocktails)} cocktails in your collection."

        return UserShelfResponse(
            user_id=current_user.id,
            cocktails=cocktails,
            total_count=len(cocktails),
            agent_greeting=greeting
        )

    except Exception as e:
        logger.error(f"Error fetching user shelf: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cocktail shelf"
        )


@router.get(
    "/{cocktail_id}",
    response_model=CocktailDetail,
    summary="Get cocktail details",
    description="Retrieve complete details for a specific cocktail including ingredients and garnishes"
)
async def get_cocktail(
    cocktail_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client)
) -> CocktailDetail:
    """
    Get complete cocktail details.
    
    Args:
        cocktail_id: UUID of the cocktail to retrieve
        current_user: Authenticated user
        supabase: Supabase client
        
    Returns:
        CocktailDetail: Complete cocktail information
        
    Raises:
        HTTPException: If cocktail not found or access denied
    """
    try:
        cocktail_repo = CocktailRepository(supabase)

        # Check if user has access to this cocktail
        if not await cocktail_repo.user_owns_cocktail(current_user.id, cocktail_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cocktail not found or access denied"
            )

        cocktail = await cocktail_repo.get_cocktail_detail(cocktail_id)

        if not cocktail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cocktail not found"
            )

        return cocktail

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cocktail {cocktail_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cocktail details"
        )


@router.post(
    "/",
    response_model=CocktailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new cocktail",
    description="Create a new cocktail and associate it with the authenticated user"
)
async def create_cocktail(
    cocktail_data: CreateCocktailRequest,
    current_user: UserResponse = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client)
) -> CocktailResponse:
    """
    Create a new cocktail.
    
    Args:
        cocktail_data: Cocktail creation request data
        current_user: Authenticated user
        supabase: Supabase client
        
    Returns:
        CocktailResponse: Creation result with cocktail details
    """
    try:
        cocktail_repo = CocktailRepository(supabase)

        # Validate ingredients exist (basic check)
        if not cocktail_data.ingredients:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one ingredient is required"
            )

        created_cocktail = await cocktail_repo.create_cocktail(cocktail_data, current_user.id)

        if not created_cocktail:
            return CocktailResponse(
                success=False,
                message="Failed to create cocktail"
            )

        return CocktailResponse(
            success=True,
            cocktail=created_cocktail,
            message="Cocktail created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating cocktail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create cocktail"
        )


@router.get(
    "/{cocktail_id}/ingredients",
    response_model=List[dict],
    summary="Get cocktail ingredients",
    description="Retrieve detailed ingredient list for a specific cocktail"
)
async def get_cocktail_ingredients(
    cocktail_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client)
):
    """
    Get detailed ingredient list for a cocktail.
    
    Args:
        cocktail_id: UUID of the cocktail
        current_user: Authenticated user
        supabase: Supabase client
        
    Returns:
        List of detailed ingredient information
    """
    try:
        cocktail_repo = CocktailRepository(supabase)

        # Check if user has access to this cocktail
        if not await cocktail_repo.user_owns_cocktail(current_user.id, cocktail_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cocktail not found or access denied"
            )

        ingredients = await cocktail_repo.get_cocktail_ingredients(cocktail_id)

        # Convert to dict format for response
        return [
            {
                "id": str(ingredient.id),
                "name": ingredient.name,
                "quantity": float(ingredient.quantity),
                "unit": ingredient.unit,
                "abv": float(ingredient.abv) if ingredient.abv else None,
                "flavor_profile": ingredient.flavor_profile,
                "hexcode": ingredient.hexcode
            }
            for ingredient in ingredients
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ingredients for cocktail {cocktail_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cocktail ingredients"
        )


@router.delete(
    "/{cocktail_id}",
    summary="Delete cocktail",
    description="Remove a cocktail from user's collection"
)
async def delete_cocktail(
    cocktail_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client)
):
    """
    Delete a cocktail from user's collection.
    
    Args:
        cocktail_id: UUID of the cocktail to delete
        current_user: Authenticated user
        supabase: Supabase client
    """
    try:
        cocktail_repo = CocktailRepository(supabase)

        # Check if user owns this cocktail
        if not await cocktail_repo.user_owns_cocktail(current_user.id, cocktail_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cocktail not found or access denied"
            )

        # Remove user-cocktail association
        supabase.table("user_cocktails").delete().eq(
            "user_id", str(current_user.id)
        ).eq("cocktail_id", str(cocktail_id)).execute()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Cocktail removed from your collection"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cocktail {cocktail_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete cocktail"
        )


@router.get(
    "/health",
    summary="Cocktail service health check",
    description="Check if cocktail management service is available"
)
async def cocktail_health():
    """
    Health check endpoint for cocktail service.
    
    Returns:
        Status message indicating service health
    """
    return {
        "status": "healthy",
        "service": "cocktail_management",
        "endpoints": [
            "GET /cocktails/shelf",
            "GET /cocktails/{cocktail_id}",
            "POST /cocktails/",
            "GET /cocktails/{cocktail_id}/ingredients",
            "DELETE /cocktails/{cocktail_id}"
        ]
    }