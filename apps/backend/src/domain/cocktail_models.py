"""Cocktail domain models for the Arthur API."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from .chat_models import MessageType

class CocktailMetadata(BaseModel):
    """Metadata for cocktail creation in chat responses."""
    id: UUID
    name: str
    ingredients: List[Dict[str, Any]]
    recipe: str
    description: Optional[str] = None

class ChatMessageMetadata(BaseModel):
    """Extended metadata for chat messages."""
    created_cocktail: Optional[CocktailMetadata] = None
    suggested_cocktails: Optional[List[str]] = None
    action_type: Optional[str] = None  # "cocktail_created", "recipe_shared", etc.

# Update existing ChatMessage model to include enhanced metadata
class EnhancedChatMessage(BaseModel):
    """Chat message with enhanced metadata support."""
    type: MessageType
    message_id: Optional[str] = None
    content: Optional[str] = None
    delta: Optional[str] = None
    complete: bool = False
    timestamp: Optional[str] = None
    metadata: Optional[ChatMessageMetadata] = None
    error: Optional[str] = None
    detail: Optional[str] = None
    code: Optional[int] = None
    should_reconnect: Optional[bool] = None
    redirect_to: Optional[str] = None

class CocktailSummary(BaseModel):
    """Summary view of a cocktail for shelf display."""
    id: UUID
    name: str
    ingredients_summary: str = Field(..., description="Comma-separated ingredient names")
    created_at: datetime


class Garnish(BaseModel):
    """Garnish model."""
    id: UUID
    name: str
    asset: Optional[str] = Field(None, description="Asset URL for garnish image")


class Glass(BaseModel):
    """Glass model."""
    id: UUID
    name: str
    asset: Optional[str] = Field(None, description="Asset URL for glass image")


class CocktailIngredient(BaseModel):
    """Ingredient with quantity for a specific cocktail."""
    id: UUID
    name: str
    quantity: Decimal
    unit: str
    abv: Optional[Decimal] = Field(None, description="Alcohol by volume percentage")
    flavor_profile: Optional[str] = None
    hexcode: Optional[str] = Field(None, description="Color hex code for visual representation")


class CocktailDetail(BaseModel):
    """Complete cocktail information."""
    id: UUID
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    has_ice: bool = False
    created_at: datetime
    ingredients: List[CocktailIngredient]
    garnishes: List[Garnish]
    glass: Optional[Glass] = None


class CreateCocktailRequest(BaseModel):
    """Request model for creating a new cocktail."""
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    has_ice: bool = False
    ingredients: List[dict] = Field(..., description="List of {ingredient_id, quantity, unit}")
    garnish_ids: Optional[List[UUID]] = Field(default_factory=list)
    glass_id: Optional[UUID] = None


class CocktailResponse(BaseModel):
    """Response model for cocktail operations."""
    success: bool
    cocktail: Optional[CocktailDetail] = None
    message: str


class UserShelfResponse(BaseModel):
    """Response model for user's cocktail shelf."""
    user_id: UUID
    cocktails: List[CocktailSummary]
    total_count: int
    agent_greeting: str = Field(default="Welcome back! Here are your cocktails.")