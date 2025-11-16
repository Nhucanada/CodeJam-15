from typing import Any, Optional, Dict, Union
from pathlib import Path

from src.core.config import get_settings
from src.domain.agent_models import AgentActionSchema
from src.infra.agent_core.prompt import Prompt
from src.infra.agent_core.rag import RAGStrategy, RAGRetrievalResult
from src.infra.agent_core.prototypes import get_prompt_prototype
from src.infra.gemini_client import get_gemini_client

from pydantic import BaseModel
from google.genai import types

import numpy as np
import json
import logging

class AgenticEngine:
    """
    Lightweight agent engine using dynamic prompt templates and RAG strategies.
    Decides which prompt template to use with a fast selector (heuristic or model-based).

    TODO: Implement model-based template selection (e.g. use LLM to select the best template)
    """

    def __init__(
        self,
        rag_strategy: RAGStrategy,
        fast_template_selector: Optional[Any] = None,
        personality: str = "You are Arthur, the Three.js PS1 throwback Agentic Bartender, who can help the user make classy cocktails."
    ) -> None:
        """
        Args:
            rag_strategy: retrieval-augmented generation strategy (implements __call__)
            fast_template_selector: callable or model, (input_str) -> str (prompt template name)
        """
        self.rag_strategy = rag_strategy
        self.fast_template_selector = fast_template_selector or self._default_selector
        self.personality = personality
        self.logger = logging.getLogger(__name__)
        
        # Get the examples directory path
        self.examples_dir = Path(__file__).parent / "examples"
        
        # Cache examples per template
        self._example_cache = {}

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
        few_shot_examples = self._get_few_shot_examples(template_name)
        if few_shot_examples:
            prompt.append("\n\n--- FEW-SHOT EXAMPLES ---")
            for idx, example in enumerate(few_shot_examples, 1):
                prompt.append(f"\n\nExample {idx}:\n{example}")
            prompt.append("\n\n--- END EXAMPLES ---\n")

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
                prompt.append(f"\n[RETRIEVED] FROM RAG CHUNKS \n{chunk}")

        # Send to Gemini
        completion = await self._invoke_llm(
            model=settings.gemini_model,
            prompt=prompt.as_string(),
            response_schema=AgentActionSchema,
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

            # TODO: Make inference output enforces schaema output
            
            # Use Gemini's JSON mode or response_mime_type
            response = await client.models.generate_content(
                model=model or settings.gemini_model,
                contents=enhanced_prompt,
                config = types.GenerationContentConfig(
                    system_instruction=self.personality,
                    temperature=1.0,
                    response_mime_type="application/json"
                )
            )
            
            # Parse and validate
            result = json.loads(response.text)
            validated = response_schema(**result)
            return validated.model_dump()

        else:
            # Regular text completion
            import logging

            logging.info(f"Prompt: {prompt}")
        
            response = await client.models.generate_content(
                model=model or settings.gemini_model,
                contents=prompt,
                config = types.GenerateContentConfig(
                    system_instruction=self.personality,
                    temperature=1.0,
                    response_mime_type="application/json"
                )
            )

        return response.text

    def _get_few_shot_examples(self, template_name: str) -> list[str]:
        """
        Provide few-shot examples to guide structured outputs per template.
        Reads examples from .txt files in the examples/ directory.
        
        Args:
            template_name: The name of the prompt template (e.g., "action_generation")
            
        Returns:
            List of example strings showing conversation history -> action schema mappings
        """
        # Check cache first
        if template_name in self._example_cache:
            return self._example_cache[template_name]
        
        # Map template names to example files
        template_to_examples = {
            "action_generation": [
                "create_drink_example.txt",
                "search_drink_example.txt",
                "suggest_drink_example.txt",
                "create_drink_custom_example.txt"
            ],
            "retrieval_augmented": [
                "create_drink_example.txt",
                "search_drink_example.txt"
            ],
            "chat_style": [
                "create_drink_example.txt",
                "suggest_drink_example.txt"
            ],
            "classic_completion": [
                "create_drink_example.txt"
            ]
        }
        
        examples = []
        example_files = template_to_examples.get(template_name, [])
        
        for example_file in example_files:
            example_path = self.examples_dir / example_file
            try:
                if example_path.exists():
                    with open(example_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        examples.append(content)
                        self.logger.debug(f"Loaded example from {example_file}")
                else:
                    self.logger.warning(f"Example file not found: {example_path}")
            except Exception as e:
                self.logger.error(f"Error reading example file {example_file}: {e}")
        
        # Cache examples for this template
        self._example_cache[template_name] = examples
        return examples
