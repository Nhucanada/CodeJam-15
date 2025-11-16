from typing import Any, Optional, Dict

from src.core.config import get_settings

from infra.agent_core.prompt import Prompt
from infra.agent_core.rag import RAGStrategy, RAGRetrievalResult
from infra.agent_core.prototypes import get_prompt_prototype
from infra.gemini_client import get_gemini_client

import numpy as np

class AgenticEngine:
    """
    Lightweight agent engine using dynamic prompt templates and RAG strategies.
    Decides which prompt template to use with a fast selector (heuristic or model-based).

    TODO: Implement model-based template selection (e.g. use LLM to select the best template)
    """

    def __init__(
        self,
        rag_strategy: RAGStrategy,
        fast_template_selector: Optional[Any] = None
    ) -> None:
        """
        Args:
            rag_strategy: retrieval-augmented generation strategy (implements __call__)
            fast_template_selector: callable or model, (input_str) -> str (prompt template name)
        """
        self.rag_strategy = rag_strategy
        self.fast_template_selector = fast_template_selector or self._default_selector

    def _default_selector(self, user_input: str) -> str:
        """
        Simple rule-based fallback for selecting a prompt template.
        """
        if "summarize" in user_input.lower():
            return "summarization"
        if "action" in user_input.lower() or "do this" in user_input.lower():
            return "action_generation"
        if any(x in user_input.lower() for x in ("context", "docs", "document", "retrieve", "reference")):
            return "retrieval_augmented"
        if any(x in user_input.lower() for x in ("how", "why", "what", "who", "where")):
            return "question_answering"
        if user_input.endswith("?"):
            return "question_answering"
        return "classic_completion"

    async def run(
        self,
        user_input: str,
        user_id: Optional[str] = None,
        top_k: int = 5,
        rag_enabled: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Core agent entrypoint. Selects prompt template, applies RAG, returns structured completion.
        """
        # Select the best prompt prototype
        template_name = self.fast_template_selector(user_input)
        settings = get_settings()
        prompt = get_prompt_prototype(template_name, user_input)

        # Optionally augment via RAG
        retrieved_chunks = []
        if rag_enabled and template_name in ("retrieval_augmented", "question_answering"):
            retrieval_results = self.rag_strategy(user_input, user_id=user_id, top_k=top_k)
            retrieved_chunks = [doc.content for doc in retrieval_results if hasattr(doc, "content")]
            for chunk in retrieved_chunks:
                prompt.append(f"\n[RETRIEVED]\n{chunk}")

        # Send to Gemini
        completion = await self._invoke_llm(
            model=settings.gemini_model,
            prompt=prompt.as_string(),
            **kwargs
        )

        return {
            "template_name": template_name,
            "prompt": prompt.as_string(),
            "completion": completion,
            "retrieved_chunks": retrieved_chunks
        }

    async def _invoke_llm(self, model: str, prompt: str, **kwargs) -> str:
        """
        Adapter for Gemini 2.5 Flash API.
        NOTE: This is a stub; plug in real Gemini API here.
        """
        settings = get_settings()
        gemini_client = get_gemini_client()

        response = await gemini_client.generate_content(
            model=model or settings.gemini_model,
            contents=[prompt],
            **kwargs
        )

        return response.text

