from typing import Any, Optional, Dict, Union

from src.core.config import get_settings
from src.infra.agent_core.prompt import Prompt
from src.infra.agent_core.rag import RAGStrategy, RAGRetrievalResult
from src.infra.agent_core.prototypes import get_prompt_prototype
from src.infra.gemini_client import get_gemini_client

from pydantic import BaseModel

import numpy as np
import json

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

        # Append few-shot examples for structured outputs
        # for example in self._get_few_shot_examples(template_name):
        #     prompt.append(example)

        # Optionally augment via RAG
        retrieved_chunks = []
        if rag_enabled and template_name in (
            "classic_completion",
            "retrieval_augmented",
            "question_answering",
            "action_generation",
            "summarization",
            "chat_style"
        ):
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

    async def _invoke_llm(self, 
        model: str, 
        prompt: str, 
        response_schema: Optional[BaseModel] = None, 
        **kwargs
    ) -> Union[str, Dict[str, Any]]:
        """
        Adapter for Gemini API 

        Args:
            model: Gemini model to use
            prompt: Prompt to send to Gemini
            response_schema: Pydantic model to validate the response
            **kwargs: Additional arguments to pass to Gemini API

        Returns:
            Union[str, Dict[str, Any]]: Response from Gemini API
        """
        settings = get_settings()
        client = get_gemini_client()
    
        # If schema provided, request JSON mode
        if response_schema:
            # Add JSON formatting instructions to prompt
            schema_json = response_schema.model_json_schema()
            enhanced_prompt = f"""{prompt}

            You MUST respond with valid JSON matching this exact schema:
            {schema_json}

            Response (JSON only, no other text):
            """
            
            # Use Gemini's JSON mode or response_mime_type
            response = await client.generate_content_async(
                model=model or settings.gemini_model,
                prompt=enhanced_prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema_json
                }
            )
            
            # Parse and validate
            result = json.loads(response.text)
            validated = response_schema(**result)
            return validated.model_dump()
        else:
            # Regular text completion
            response = await client.generate_content_async(prompt)
        return response.text

    def _get_few_shot_examples(self, template_name: str) -> list[str]:
        """
        Provide few-shot examples to guide structured outputs per template.
        """
        examples: dict[str, list[str]] = {
            "question_answering": [
                (
                    "[FEW-SHOT][QUESTION_ANSWERING]\n"
                    "Question: \"What ingredients are required for a classic Negroni?\"\n"
                    "Answer JSON:\n"
                    "{\n"
                    "  \"type\": \"question_answering\",\n"
                    "  \"question\": \"What ingredients are required for a classic Negroni?\",\n"
                    "  \"answer\": \"Combine equal parts gin, sweet vermouth, and Campari over ice, then garnish with an orange peel.\",\n"
                    "  \"citations\": [\n"
                    "    {\"source\": \"recipes.negroni\", \"relevance\": 0.95}\n"
                    "  ],\n"
                    "  \"confidence\": 0.94\n"
                    "}"
                ),
                (
                    "[FEW-SHOT][QUESTION_ANSWERING]\n"
                    "Question: \"Which glass should I use for an Old Fashioned?\"\n"
                    "Answer JSON:\n"
                    "{\n"
                    "  \"type\": \"question_answering\",\n"
                    "  \"question\": \"Which glass should I use for an Old Fashioned?\",\n"
                    "  \"answer\": \"Serve an Old Fashioned in a chilled rocks glass to preserve the aromatics and provide enough space for the ice cube.\",\n"
                    "  \"citations\": [\n"
                    "    {\"source\": \"bar_guide.glassware\", \"relevance\": 0.88}\n"
                    "  ],\n"
                    "  \"confidence\": 0.91\n"
                    "}"
                ),
            ],
            "action_generation": [
                (
                    "[FEW-SHOT][ACTION_GENERATION]\n"
                    "Request: \"Create a tropical mocktail with mango and coconut.\"\n"
                    "StructuredResponse:\n"
                    "{\n"
                    "  \"action\": \"create_drink\",\n"
                    "  \"input\": \"Create a tropical mocktail with mango and coconut.\",\n"
                    "  \"output\": {\n"
                    "    \"name\": \"Tropical Calm\",\n"
                    "    \"description\": \"A refreshing mango-coconut mocktail with bright citrus.\",\n"
                    "    \"ingredients\": [\n"
                    "      {\"name\": \"mango puree\", \"amount\": 3, \"unit\": \"oz\"},\n"
                    "      {\"name\": \"coconut water\", \"amount\": 2, \"unit\": \"oz\"},\n"
                    "      {\"name\": \"lime juice\", \"amount\": 0.5, \"unit\": \"oz\"}\n"
                    "    ],\n"
                    "    \"instructions\": [\n"
                    "      \"Shake all ingredients with ice\",\n"
                    "      \"Strain into a chilled coupe\"\n"
                    "    ],\n"
                    "    \"glass_type\": \"coupe\",\n"
                    "    \"garnish\": \"toasted coconut flakes\"\n"
                    "  }\n"
                    "}"
                )
            ],
            "classic_completion": [
                (
                    "[FEW-SHOT][CLASSIC_COMPLETION]\n"
                    "Prompt: \"Describe the mouthfeel of a Manhattan.\"\n"
                    "Response:\n"
                    "{\n"
                    "  \"structure\": \"descriptive_paragraph\",\n"
                    "  \"content\": \"A Manhattan coats the palate with a silky texture from sweet vermouth, balanced by rye spice and a lingering herbal finish from bitters.\"\n"
                    "}"
                ),
                (
                    "[FEW-SHOT][CLASSIC_COMPLETION]\n"
                    "Prompt: \"Give a tasting note for a citrus-forward gin.\"\n"
                    "Response:\n"
                    "{\n"
                    "  \"structure\": \"tasting_note\",\n"
                    "  \"content\": \"Bright lemon verbena on the nose, candied grapefruit peel mid-palate, and a crisp juniper snap on the finish.\"\n"
                    "}"
                ),
            ],
        }

        return examples.get(template_name, [])

