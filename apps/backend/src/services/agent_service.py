from typing import Annotated, Optional, Union

from fastapi import HTTPException, status

from src.infra.gemini_client import get_gemini_client

from src.domain.agent_models import ActionType, DrinkIngredient