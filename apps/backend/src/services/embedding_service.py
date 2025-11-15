from typing import List
from pydantic import BaseModel, Field

from google.genai import GeminiClient

from infra.gemini_client import get_gemini_client
from core.config import get_settings, Settings


class EmbeddingResponse(BaseModel):
    embedding: List[float] = Field(..., description="Vector embedding for a single text input")

class EmbeddingsResponse(BaseModel):
    embeddings: List[List[float]] = Field(..., description="List of vector embeddings for multiple text inputs")


def get_embedding(text: str) -> List[float]:
    """
    Get the embedding for a given text.
    """
    settings: Settings = get_settings()
    gemini_client: GeminiClient = get_gemini_client()

    response = gemini_client.embed_content(
        model=settings.gemini_model,
        contents=[text]
    )

    return EmbeddingResponse(embedding=response.embeddings[0])

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get the embeddings for a given list of texts.
    """
    settings: Settings = get_settings()
    gemini_client: GeminiClient = get_gemini_client()
    
    response = gemini_client.embed_content(
        model=settings.gemini_model,
        contents=texts
    )

    return EmbeddingsResponse(embeddings=response.embeddings.copy())

def get_embedding_with_task_type(text: str, task_type: str) -> List[float]:
    """
    Get the embedding for a given text and task type.
    """
    settings: Settings = get_settings()
    gemini_client: GeminiClient = get_gemini_client()

    response = gemini_client.embed_content(
        model=settings.gemini_model,
        contents=[text],
        task_type=task_type
    )

    return EmbeddingResponse(embedding=response.embeddings[0])