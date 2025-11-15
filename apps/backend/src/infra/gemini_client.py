
"""Google Gemini client initialization and management."""

from functools import lru_cache
from typing import Optional

from src.core.config import get_settings

# You may need to install and use the official Gemini API client library.
# For this stub, we'll just use 'google.generativeai' as per Gemini's Python SDK.
import google.generativeai as genai

_gemini_client: Optional[genai.GenerativeModel] = None


def init_gemini() -> genai.GenerativeModel:
    """Initialize Gemini client with configuration."""
    global _gemini_client

    if _gemini_client is None:
        settings = get_settings()
        api_key = getattr(settings, "gemini_api_key", None)
        if not api_key:
            raise RuntimeError("Gemini API key is not configured")
        genai.configure(api_key=api_key)
        # You may select an available model or expose as param in the config
        _gemini_client = genai.GenerativeModel('gemini-pro')

    return _gemini_client


@lru_cache
def get_gemini_client() -> genai.GenerativeModel:
    """Get cached Gemini client instance."""
    return init_gemini()

