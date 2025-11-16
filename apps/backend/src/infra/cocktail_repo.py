"""Cocktail repository for database operations."""

import logging
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from supabase import Client as SupabaseClient

from src.domain.cocktail_models import (
    CocktailDetail,
    CocktailIngredient,
    CocktailSummary,
    CreateCocktailRequest,
    Garnish,
    Glass
)

logger = logging.getLogger(__name__)


class CocktailRepository:
    """Repository for cocktail database operations."""

    def __init__(self, supabase: SupabaseClient):
        self.supabase = supabase

    async def get_user_cocktails(self, user_id: UUID) -> List[CocktailSummary]:
        """Get all cocktails for a user with ingredient summaries."""
        try:
            # Get user's cocktails with ingredients
            response = self.supabase.table("user_cocktails").select(
                """
                cocktail_id,
                cocktail!inner(
                    id,
                    name,
                    created_at,
                    cocktail_ingredient!inner(
                        ingredient!inner(name)
                    )
                )
                """
            ).eq("user_id", str(user_id)).execute()

            cocktails = []
            for item in response.data:
                cocktail = item["cocktail"]

                # Build ingredients summary
                ingredient_names = [
                    ci["ingredient"]["name"]
                    for ci in cocktail.get("cocktail_ingredient", [])
                ]
                ingredients_summary = ", ".join(ingredient_names)

                cocktails.append(CocktailSummary(
                    id=UUID(cocktail["id"]),
                    name=cocktail["name"],
                    ingredients_summary=ingredients_summary,
                    created_at=cocktail["created_at"]
                ))

            return cocktails

        except Exception as e:
            logger.error(f"Error fetching user cocktails: {e}")
            return []

    async def get_cocktail_detail(self, cocktail_id: UUID) -> Optional[CocktailDetail]:
        """Get complete cocktail details including ingredients and garnishes."""
        try:
            # Get cocktail with all related data
            response = self.supabase.table("cocktail").select(
                """
                *,
                cocktail_ingredient(
                    quantity,
                    unit,
                    ingredient(*)
                ),
                cocktail_garnish(
                    garnish(
                        id,
                        name,
                        garnish_to_asset(asset)
                    )
                )
                """
            ).eq("id", str(cocktail_id)).single().execute()

            if not response.data:
                return None

            cocktail_data = response.data

            # Build ingredients list
            ingredients = []
            for ci in cocktail_data.get("cocktail_ingredient", []):
                ingredient_data = ci["ingredient"]
                ingredients.append(CocktailIngredient(
                    id=UUID(ingredient_data["id"]),
                    name=ingredient_data["name"],
                    quantity=Decimal(str(ci["quantity"])) if ci["quantity"] else Decimal("0"),
                    unit=ci["unit"] or "",
                    abv=Decimal(str(ingredient_data["abv"])) if ingredient_data.get("abv") else None,
                    flavor_profile=ingredient_data.get("flavor_profile"),
                    hexcode=ingredient_data.get("hexcode")
                ))

            # Build garnishes list
            garnishes = []
            for cg in cocktail_data.get("cocktail_garnish", []):
                garnish_data = cg["garnish"]
                asset_data = garnish_data.get("garnish_to_asset")
                asset_url = asset_data[0]["asset"] if asset_data else None

                garnishes.append(Garnish(
                    id=UUID(garnish_data["id"]),
                    name=garnish_data["name"],
                    asset=asset_url
                ))

            return CocktailDetail(
                id=UUID(cocktail_data["id"]),
                name=cocktail_data["name"],
                type=cocktail_data.get("type"),
                description=cocktail_data.get("description"),
                has_ice=cocktail_data.get("has_ice", False),
                created_at=cocktail_data["created_at"],
                ingredients=ingredients,
                garnishes=garnishes
            )

        except Exception as e:
            logger.error(f"Error fetching cocktail detail: {e}")
            return None

    async def create_cocktail(self, cocktail_data: CreateCocktailRequest, user_id: UUID) -> Optional[CocktailDetail]:
        """Create a new cocktail and associate it with the user."""
        try:
            # Create the cocktail
            cocktail_response = self.supabase.table("cocktail").insert({
                "name": cocktail_data.name,
                "type": cocktail_data.type,
                "description": cocktail_data.description,
                "has_ice": cocktail_data.has_ice
            }).execute()

            if not cocktail_response.data:
                return None

            cocktail_id = cocktail_response.data[0]["id"]

            # Create user-cocktail association
            self.supabase.table("user_cocktails").insert({
                "user_id": str(user_id),
                "cocktail_id": cocktail_id,
                "role": "owner"
            }).execute()

            # Add ingredients
            for ingredient_data in cocktail_data.ingredients:
                self.supabase.table("cocktail_ingredient").insert({
                    "cocktail_id": cocktail_id,
                    "ingredient_id": str(ingredient_data["ingredient_id"]),
                    "quantity": float(ingredient_data["quantity"]),
                    "unit": ingredient_data["unit"]
                }).execute()

            # Add garnishes if provided
            if cocktail_data.garnish_ids:
                garnish_inserts = [
                    {
                        "cocktail_id": cocktail_id,
                        "garnish_id": str(garnish_id)
                    }
                    for garnish_id in cocktail_data.garnish_ids
                ]
                self.supabase.table("cocktail_garnish").insert(garnish_inserts).execute()

            # Return the complete cocktail detail
            return await self.get_cocktail_detail(UUID(cocktail_id))

        except Exception as e:
            logger.error(f"Error creating cocktail: {e}")
            return None

    async def get_cocktail_ingredients(self, cocktail_id: UUID) -> List[CocktailIngredient]:
        """Get detailed ingredient list for a cocktail."""
        try:
            response = self.supabase.table("cocktail_ingredient").select(
                """
                quantity,
                unit,
                ingredient(*)
                """
            ).eq("cocktail_id", str(cocktail_id)).execute()

            ingredients = []
            for ci in response.data:
                ingredient_data = ci["ingredient"]
                ingredients.append(CocktailIngredient(
                    id=UUID(ingredient_data["id"]),
                    name=ingredient_data["name"],
                    quantity=Decimal(str(ci["quantity"])) if ci["quantity"] else Decimal("0"),
                    unit=ci["unit"] or "",
                    abv=Decimal(str(ingredient_data["abv"])) if ingredient_data.get("abv") else None,
                    flavor_profile=ingredient_data.get("flavor_profile"),
                    hexcode=ingredient_data.get("hexcode")
                ))

            return ingredients

        except Exception as e:
            logger.error(f"Error fetching cocktail ingredients: {e}")
            return []

    async def cocktail_exists(self, cocktail_id: UUID) -> bool:
        """Check if a cocktail exists."""
        try:
            response = self.supabase.table("cocktail").select("id").eq("id", str(cocktail_id)).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error checking cocktail existence: {e}")
            return False

    async def user_owns_cocktail(self, user_id: UUID, cocktail_id: UUID) -> bool:
        """Check if user owns or has access to a cocktail."""
        try:
            response = self.supabase.table("user_cocktails").select("cocktail_id").eq(
                "user_id", str(user_id)
            ).eq("cocktail_id", str(cocktail_id)).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error checking cocktail ownership: {e}")
            return False