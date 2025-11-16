"""Factory for creating and managing AgenticEngine singleton."""

from typing import Optional

from src.infra.agent_core.engine import AgenticEngine
from src.infra.agent_core.rag import SupabaseVectorDatabaseSearch
from src.infra.supabase_client import get_supabase_client
from src.core.config import get_settings


_engine_instance: Optional[AgenticEngine] = None


def get_agentic_engine() -> AgenticEngine:
    """
    Get or create the singleton AgenticEngine instance.
    
    This engine is stateless and can be safely reused across all
    WebSocket connections and user sessions. Personalization happens
    via the user_id parameter passed to engine.run().
    
    Returns:
        AgenticEngine: Singleton engine instance
    """
    global _engine_instance
    
    if _engine_instance is None:
        settings = get_settings()
        supabase = get_supabase_client()

        RAG_TABLES = [
            "saq_product_embedding",
            "ingredient_embedding",
            "cocktail_embedding"
        ]
        
        # Initialize RAG strategy with Supabase vector database
        rag_strategy = SupabaseVectorDatabaseSearch(
            supabase=supabase,
            table=RAG_TABLES, 
            embedding_model=settings.gemini_embedding_model
        )
        
        # Create the singleton engine
        _engine_instance = AgenticEngine(rag_strategy=rag_strategy)
    
    return _engine_instance


def reset_agentic_engine() -> None:
    """
    Reset the singleton engine instance (mainly for testing).
    """
    global _engine_instance
    _engine_instance = None

