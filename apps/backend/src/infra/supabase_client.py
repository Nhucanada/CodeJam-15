"""Supabase client initialization and management."""

from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from src.core.config import get_settings

# Singleton pattern for Supabase client within container
_supabase_client: Optional[Client] = None


def init_supabase() -> Client:
    """Initialize Supabase client with configuration."""
    global _supabase_client
    
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key
        )
    
    return _supabase_client


@lru_cache
def get_supabase_client() -> Client:
    """Get cached Supabase client instance."""
    return init_supabase()

