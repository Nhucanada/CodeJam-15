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
        try:
            # Generate embedding for the query
            query_embedding = self._generate_embedding(query)

            # Build base query for vector similarity search
            query_builder = self.supabase.table(self.table).select(
                "content, metadata, embedding"
            ).order("embedding <-> %s" % query_embedding, desc=False).limit(top_k)

            # Filter by user_id if provided (for user-specific drinks)
            if user_id:
                query_builder = query_builder.eq("user_id", user_id)

            # Execute the query
            response = query_builder.execute()

            if not response.data:
                return []

            # Transform results to RAGRetrievalResult objects
            results = []
            for item in response.data:
                # Calculate cosine similarity score
                doc_embedding = np.array(item.get("embedding", []))
                if len(doc_embedding) > 0 and len(query_embedding) > 0:
                    similarity_score = cosine_similarity(
                        query_embedding.reshape(1, -1),
                        doc_embedding.reshape(1, -1)
                    )[0][0]
                else:
                    similarity_score = 0.0

                result = RAGRetrievalResult(
                    content=item.get("content", ""),
                    metadata=item.get("metadata", {}),
                    score=float(similarity_score)
                )
                results.append(result)

            return results

        except Exception as e:
            print(f"Error in RAG retrieval: {e}")
            return []

    def _generate_embedding(self, text: str) -> np.ndarray:
        from services.embedding_service import get_embedding_with_task_type

        # Use QUESTION_ANSWERING task type for better retrieval embeddings
        embedding_list = get_embedding_with_task_type(text, "QUESTION_ANSWERING")

        # Convert to numpy array
        if hasattr(embedding_list, 'embedding'):
            # Handle case where EmbeddingResponse object is returned
            return np.array(embedding_list.embedding)
        else:
            # Handle case where list is returned directly
            return np.array(embedding_list)
        
class NoOpRetrieval(RAGStrategy):
    """
    No-op retrieval strategy.
    """

    def __call__(self, query: str, user_id: Optional[str] = None, top_k: int = 5, **kwargs) -> np.ndarray[RAGRetrievalResult]:
        return []