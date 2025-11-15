from typing import List, Optional, Protocol
from pydantic import BaseModel, Field

from supabase import Client as SupabaseClient

from sklearn.metrics.pairwise import cosine_similarity

import numpy as np

class RAGRetrievalResult(BaseModel):
    content: str = Field(..., description="Content of the retrieved document")
    metadata: Optional[dict] = Field(None, description="Metadata of the retrieved document")
    score: Optional[float] = Field(None, description="Score of the retrieved document")

class RAGStrategy(Protocol):
    """
    Retrieval Strategies for RAG.
    Structural typing via Protocol: anything that implements the __call__ method with the signature of the __call__ method.
    """

    def __call__(self, query: str, user_id: Optional[str] = None, top_k: int = 5, **kwargs) -> np.ndarray[RAGRetrievalResult]:
        ...

class SupabaseVectorDatabaseSearch(RAGStrategy):
    """
    Search the Supabase vector database for the most relevant documents.
    """

    def __init__(self, supabase: SupabaseClient, table: str, embedding_model: str):
        self.supabase = supabase    
        self.table = table
        self.embedding_model = embedding_model

    def __call__(self, query: str, user_id: Optional[str] = None, top_k: int = 5, **kwargs) -> np.ndarray[RAGRetrievalResult]:
        ...

        # TODO: Implement the actual retrieval logic via the Supabase vector database

        # Note: Use cosine similarity to find the most relevant knowledge base documents
        # Note: Use cosine similarity to find the most relevant drinks in the user's own id base

        



class NoOpRetrieval(RAGStrategy):
    """
    No-op retrieval strategy.
    """

    def __call__(self, query: str, user_id: Optional[str] = None, top_k: int = 5, **kwargs) -> np.ndarray[RAGRetrievalResult]:
        return []