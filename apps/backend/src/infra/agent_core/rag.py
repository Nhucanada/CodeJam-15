from typing import List, Optional, Protocol
from pydantic import BaseModel, Field

from supabase import Client as SupabaseClient
from sklearn.metrics.pairwise import cosine_similarity

import numpy as np
import logging

logger = logging.getLogger(__name__)

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
        self.tables: list[str] = table if isinstance(table, list) else [table]
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

            # Multi-table vector search
            table_list: list[str] = self.tables
            all_results: list[RAGRetrievalResult] = []

            if table_list:
                for tbl in table_list:
                    query_builder = self.supabase.table(tbl).select(
                        "content, metadata, embedding"
                    ).order("embedding <-> %s" % query_embedding, desc=False).limit(top_k)
                    if user_id:
                        query_builder = query_builder.eq("user_id", user_id)
                    response = query_builder.execute()
                    if not response.data:
                        continue
                    for item in response.data:
                        # Compute cosine similarity score
                        doc_embedding = np.array(item.get("embedding", []))
                        similarity_score = (
                            float(cosine_similarity(query_embedding.reshape(1, -1), doc_embedding.reshape(1, -1))[0][0])
                            if doc_embedding.size > 0 and query_embedding.size > 0 else 0.0
                        )
                        all_results.append(
                            RAGRetrievalResult(
                                content=item.get("content", ""),
                                metadata=item.get("metadata", {}),
                                score=similarity_score
                            )
                        )

            # Sort all results by score descending, take top_k overall
            logger.info(f"All results: {all_results}")
            all_results.sort(key=lambda x: x.score if x.score is not None else 0.0, reverse=True)
            return all_results[:top_k]

        except Exception as e:
            print(f"Error in RAG retrieval: {e}")
            return []

    def _generate_embedding(self, text: str) -> np.ndarray:
        from src.services.embedding_service import get_embedding_with_task_type

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