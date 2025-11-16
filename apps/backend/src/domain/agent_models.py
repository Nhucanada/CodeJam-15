from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

class ActionType(str, Enum):
    CREATE_DRINK = "create_drink"
    CREATE_INGREDIENT = "create_ingredient"
    SEARCH_DRINK = "search_drink"
    SUGGEST_DRINK = "suggest_drink"


class DrinkIngredient(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=100)


class DrinkRecipeSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    ingredients: list[DrinkIngredient] = Field(..., min_items=1)
    instructions: list[str] = Field(..., min_items=1)
    glass_type: str = Field(default="rocks glass")
    garnish: str | None = None


class AgentActionSchema(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

    # Action-specific fields
    action_type: ActionType
    confidence: float = Field(..., ge=0, le=1)
    reasoning: str = Field(..., max_length=1000)

    drink_recipe: DrinkRecipeSchema | None = None
    suggest_drink: DrinkRecipeSchema | None = None