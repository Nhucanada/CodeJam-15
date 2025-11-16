from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator

class ActionType(str, Enum):
    CREATE_DRINK = "create_drink"
    # CREATE_INGREDIENT = "create_ingredient"
    SEARCH_DRINK = "search_drink"
    SUGGEST_DRINK = "suggest_drink"


class DrinkIngredient(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., ge=0.01, description="Ingredient amount (e.g., 100) in the unit of measurement")
    color: str = Field(..., pattern="^#(?:[0-9a-fA-F]{3}){1,2}$", description="Ingredient color as hex code (e.g., #ffcc00)")
    unit: str = Field(..., min_length=1, max_length=20, description="Ingredient unit of measurement (e.g., ml, g, tsp)")


class DrinkRecipeSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    ingredients: list[DrinkIngredient] = Field(..., min_items=1)
    instructions: list[str] = Field(..., min_items=1)
    glass_type: str = Field(default="rocks glass", description="Glass type for the drink (e.g., zombie, cocktail)")
    garnish: str = Field(default=None, max_length=100, description="Garnish for the drink (e.g., lemon, cherry)")
    has_ice: bool = Field(default=True, description="Whether the drink has ice")


class AgentActionSchema(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    # Action-specific fields
    action_type: ActionType | None
    confidence: float = Field(..., ge=0, le=1)
    reasoning: str = Field(..., max_length=1000, description="Reasoning for the action (e.g., why the action was taken)")
    conversation: str = Field(..., max_length=1000, description="What to say to the user while making the drink")

    drink_recipe: DrinkRecipeSchema | None = None
    suggest_drink: DrinkRecipeSchema | None = None

    @field_validator('reasoning', mode='before')
    @classmethod
    def flatten_reasoning(cls, v: Any) -> str:
        """
        Flatten reasoning if it comes as a nested object from the LLM.
        Gemini sometimes returns reasoning as {"step1": "...", "step2": "..."} instead of a string.
        """
        if isinstance(v, dict):
            # Concatenate all values in the dict to create a single reasoning string
            reasoning_parts = []
            for key in sorted(v.keys()):
                value = v[key]
                if isinstance(value, str):
                    reasoning_parts.append(value)
                elif isinstance(value, dict):
                    # Handle nested dicts
                    reasoning_parts.append(str(value))
            return " ".join(reasoning_parts)
        return str(v)

class AgentResponseSchema(BaseModel):
    action: AgentActionSchema | None = None
    error: str | None = None
    conversation: str | None = None