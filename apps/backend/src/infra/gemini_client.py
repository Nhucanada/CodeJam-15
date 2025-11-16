
"""Google Gemini client initialization and management."""

from functools import lru_cache
from typing import Optional

from src.core.config import get_settings

from google import genai
from google.genai import types

_gemini_client: Optional[genai.Client] = None


def init_gemini() -> genai.Client:
    """Initialize Gemini client with configuration."""
    global _gemini_client

    if _gemini_client is None:
        settings = get_settings()
        api_key = getattr(settings, "gemini_api_key", None)
        if not api_key:
            raise RuntimeError("Gemini API key is not configured")

        _gemini_client = genai.Client()

    return _gemini_client


@lru_cache
def get_gemini_client() -> genai.Client:
    """Get cached Gemini client instance."""
    return init_gemini()

