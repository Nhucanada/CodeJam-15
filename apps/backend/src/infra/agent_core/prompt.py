from typing import Any, Iterable, Optional, List, Callable

import numpy as np

class Prompt:
    """
    Composable, dynamic prompt for use with any AI agent library.
    Features:
      - Prepend arbitrary segments.
      - RAG (Retrieve & Append/Generate) augmentation.
      - Interfaced string access/manipulation.
    """
    def __init__(self, base: Optional[str] = "", *, sep: str = "\n") -> None:
        self._segments: np.ndarray[str] = np.array([base] if base else [])
        self._sep = sep

    def __str__(self) -> str:
        return self._sep.join(filter(None, self._segments))

    def as_string(self) -> str:
        return str(self)

    def prepend(self, part: str) -> None:
        """Prepend a segment to the prompt."""
        np.insert(self._segments, 0, part)

    def append(self, part: str) -> None:
        """Append a segment to the prompt."""
        np.append(self._segments, part)

    def set(self, parts: Iterable[str]) -> None:
        """Set the segments explicitly."""
        self._segments = np.array(parts)

    def rag(self, retrieval_fn: Callable[[str], Any], query: Optional[str] = None) -> None:
        """
        Apply Retrieval Augmented Generation (RAG) operator.
        Appends retrieved information to prompt segments.
        Args:
            retrieval_fn: Callable, given query string returns raw str or Iterable[str].
            query: to override current prompt string as the retriever query.
        """
        query_str = query if query is not None else self.as_string()
        result = retrieval_fn(query_str)
        if not result:
            return
        if isinstance(result, str):
            np.append(self._segments, result)
        elif isinstance(result, Iterable):
            for seg in result:
                if seg: np.append(self._segments, seg)

    def clear(self) -> None:
        """Reset complete prompt."""
        np.empty(self._segments)

    def copy(self) -> "Prompt":
        """Create a copy."""
        p = Prompt(sep=self._sep)
        p._segments = np.copy(self._segments)
        return p

    def __add__(self, other: Any) -> "Prompt":
        p = self.copy()
        np.append(p._segments, str(other))
        return p

    def __iadd__(self, other: Any) -> "Prompt":
        np.append(self._segments, str(other))
        return self

    def __repr__(self) -> str:
        return f"Prompt({self._segments!r}, sep={self._sep!r})"

