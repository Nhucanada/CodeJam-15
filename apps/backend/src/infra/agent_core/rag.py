from typing import List, Optional, Protocol
from annotated_doc import Doc
from pydantic import BaseModel, Field

from supabase import Client as SupabaseClient
from sklearn.metrics.pairwise import cosine_similarity

import numpy as np
import logging

import ast


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
        """
        Perform RAG over one or more Supabase tables containing vector embeddings.

        Flow:
          1. Embed the incoming query with the configured embedding model.
          2. Fetch candidate rows from each table (optionally filtered by user_id).
          3. Compute cosine similarity between the query embedding and each row's embedding.
          4. Return the globally top_k results across all tables.

        Notes:
          - We intentionally compute similarity in-process using NumPy + sklearn to avoid
            relying on provider-specific SQL syntax like `embedding <-> query`.
        """
        try:
            # Generate embedding for the query
            query_embedding = self._generate_embedding(query)

            if query_embedding is None or getattr(query_embedding, "size", 0) == 0:
                logger.warning("RAG query embedding is empty; returning no results.")
                return []

            # Ensure NumPy array and normalize for stable cosine similarity
            query_embedding = np.array(query_embedding, dtype=np.float32)
            query_norm = np.linalg.norm(query_embedding)
            if query_norm > 0:
                query_embedding = query_embedding / query_norm

            logger.debug(f"Query embedding shape: {query_embedding.shape}")

            # Number of raw candidates to pull per table before re-ranking locally
            max_candidates_per_table: int = kwargs.get("max_candidates_per_table", max(top_k * 10, top_k))

            table_list: list[str] = self.tables
            all_results: list[RAGRetrievalResult] = []

            logger.info("PERFORMING RAG SEARCH FOR TABLES")

            for tbl in table_list:
                logger.info(f"Searching table: {tbl}, max: {max_candidates_per_table}")

                query_builder = (
                    self.supabase
                    .from_(f"{tbl}")
                    .select('id, content, embedding')
                    .limit(max_candidates_per_table)
                )

                response = query_builder.execute()

                rows = response.data or []

                if not rows:
                    logger.info(f"No rows returned from table {tbl}")
                    continue

                for item in rows:
                    raw_embedding = item.get("embedding") or []
                    if not raw_embedding:
                        continue

                    embedding = ast.literal_eval(raw_embedding)
                    doc_embedding = np.array(embedding, dtype=np.float32)
                    if doc_embedding.size == 0:
                        continue

                    # Normalize document embedding for cosine similarity
                    doc_norm = np.linalg.norm(doc_embedding)
                    if doc_norm == 0:
                        continue

                    doc_embedding = doc_embedding / doc_norm

                    # Compute cosine similarity score
                    similarity_score = float(
                        cosine_similarity(
                            query_embedding.reshape(1, -1),
                            doc_embedding.reshape(1, -1),
                        )[0][0]
                    )

                    all_results.append(
                        RAGRetrievalResult(
                            content=item.get("content", "") or "",
                            metadata=item.get("metadata", {}) or {},
                            score=similarity_score,
                        )
                    )

            if not all_results:
                logger.info("RAG search returned no candidates across all tables.")
                return []

            # Sort all results by score descending, take top_k overall
            all_results.sort(
                key=lambda x: x.score if x.score is not None else 0.0,
                reverse=True,
            )
            top_results = all_results[:top_k]

            logger.debug(
                "RAG search completed. Total candidates=%d, returning top_k=%d",
                len(all_results),
                len(top_results),
            )

            return top_results

        except Exception as e:
            logger.exception(f"Error in RAG retrieval: {e}")
            return []

    def _generate_embedding(self, text: str) -> np.ndarray:
        from src.services.embedding_service import get_embedding_with_task_type

        # Use QUESTION_ANSWERING task type for better retrieval embeddings
        embedding_list = get_embedding_with_task_type(text, "RETRIEVAL_QUERY")

        logger.debug(f"Embedding list: {embedding_list}")

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