from typing import List
import numpy as np
from pydantic import BaseModel, Field, ConfigDict

from google.genai import Client, types

from src.infra.gemini_client import get_gemini_client
from src.core.config import get_settings, Settings

import logging

logger = logging.getLogger(__name__)

class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    embedding: np.ndarray = Field(..., description="Vector embedding for a single text input")

class EmbeddingsResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    embeddings: np.ndarray = Field(..., description="Matrix of vector embeddings for multiple text inputs")


def get_embedding(text: str) -> np.ndarray:
    """
    Get the embedding for a given text.
    Returns a numpy array for computational efficiency.
    """
    settings: Settings = get_settings()
    client: Client = get_gemini_client()

    response = client.models.embed_content(
        model=settings.gemini_model,
        contents=[text]
    )

    return np.array(response.embeddings[0].values)

def get_embeddings(texts: List[str]) -> np.ndarray:
    """
    Get the embeddings for a given list of texts.
    Returns a numpy array matrix for computational efficiency.
    """
    settings: Settings = get_settings()
    client: Client = get_gemini_client()
    
    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=texts
    )

    result = [np.array(e.values) for e in response.embeddings]
    return np.array(result)

def get_embedding_with_task_type(text: str, task_type: str) -> np.ndarray:
    """
    Get the embedding for a given text and task type.
    Returns a numpy array for computational efficiency.
    """
    settings: Settings = get_settings()
    client: Client = get_gemini_client()

    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=[text],
        config=types.EmbedContentConfig(task_type=task_type)
    )

    logger.debug(response.embeddings)

    return np.array(response.embeddings[0].values)