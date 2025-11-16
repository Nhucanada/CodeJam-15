from typing import Any, Optional, Dict, Union
from pathlib import Path

from sklearn.metrics.pairwise import config_context

from src.core.config import get_settings
from src.domain.agent_models import AgentActionSchema

from src.core.config import get_settings
from src.infra.agent_core.prompt import Prompt
from src.infra.agent_core.rag import RAGStrategy, RAGRetrievalResult
from src.infra.agent_core.prototypes import get_prompt_prototype
from src.infra.gemini_client import get_gemini_client

from pydantic import BaseModel
from google.genai import types

import numpy as np
import json
import logging

logger = logging.getLogger(__name__)


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
        personality: str = """You are Arthur, the Three.js PS1 throwback Agentic Bartender, who can help the user make classy cocktails.""",
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
        # Detect drink requests (highest priority)
        drink_keywords = [
            "make me",
            "create",
            "prepare",
            "mix",
            "mix me",
            "build",
            "recommend",
            "i want",
            "i'd like",
        ]
        if any(keyword in user_input.lower() for keyword in drink_keywords):
            return "action_generation"
        if "summarize" in user_input.lower():
            return "summarization"
        if "action" in user_input.lower() or "do this" in user_input.lower():
            return "action_generation"
        if any(
            x in user_input.lower()
            for x in ("context", "docs", "document", "retrieve", "reference")
        ):
            return "retrieval_augmented"
        if any(x in user_input.lower() for x in ("how", "why", "what", "who", "where")):
            return "question_answering"
        if user_input.endswith("?"):
            return "question_answering"
        return "classic_completion"

    async def _llm_selector(self, user_input: str) -> str:
        # TODO: Use LLM to select the best prompt template based on the user input
        ...

    async def run(
        self,
        user_input: str,
        user_id: Optional[str] = None,
        top_k: int = 5,
        rag_enabled: bool = True,
        **kwargs,
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
            prompt.append("\n\n[FEW-SHOT EXAMPLES]")
            for idx, example in enumerate(few_shot_examples, 1):
                prompt.append(f"\n\nExample {idx}:\n{example}")
            prompt.append("\n[END EXAMPLES]\n")

        # Optionally augment via RAG
        prompt.append("\n\n[CONTEXT FETCHED FROM ONLINE RAG DATABASE]")
#         prompt.append(f"""\nYour capabilities:
# Can create new drinks based on context of example drinks (e.g. SAQ Product)

# - CREATE_DRINK (action_type: "create_drink"): When the user requests a specific cocktail by name (e.g., "make me an Old Fashioned", "I want a Mojito", "fix me a Margarita"). You should provide the complete recipe with ingredients, measurements, instructions, glass type, and garnish.
# - SUGGEST_DRINK (action_type: "suggest_drink"): When the user describes preferences or asks for recommendations without naming a specific drink (e.g., "something fruity", "I want something strong", "surprise me", "what's good?"). Analyze their preferences and suggest an appropriate cocktail.
# - SEARCH_DRINK (action_type: "search_drink"): When the user asks about drinks containing certain ingredients or wants to explore options (e.g., "what can I make with whiskey and honey?", "drinks with gin", "show me bourbon cocktails").

# - Glass type (MUST be one of: zombie glass, cocktail glass, rocks glass, hurricane glass, pint glass, seidel glass, shot glass, highball glass, margarita glass, martini glass)
# - Garnish (MUST be one of: lemon, lime, orange, cherry, olive, salt_rim, mint, or null)
# - Ice preference (true/false)\n""")
        retrieved_chunks = []
        if rag_enabled:
            retrieval_results = self.rag_strategy(user_input, user_id=user_id, top_k=top_k)
            retrieved_chunks = [doc.content for doc in retrieval_results if hasattr(doc, "content")]
            for chunk in retrieved_chunks:
                prompt.append(f"\n[RETRIEVED]\n{chunk}")
        prompt.append("\n[END CONTEXT FETCHED FROM ONLINE RAG DATABASE]\n")

        prompt.append(f"\n[CONVERSATION]\n{user_input}")

        # Send to Gemini
        completion = await self._invoke_llm(
            model=settings.gemini_model,
            prompt=prompt.as_string(),
            response_schema=AgentActionSchema,
            **kwargs,
        )

        return {
            "template_name": template_name,
            "prompt": prompt.as_string(),
            "completion": completion,
            "retrieved_chunks": retrieved_chunks,
        }

    async def _invoke_llm(
        self,
        model: str,
        prompt: str,
        response_schema: Optional[BaseModel] = None,
        **kwargs,
    ) -> Union[Dict[str, Any], str]:
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
            schema_str = json.dumps(schema_json, indent=2)
            enhanced_prompt = f"""{prompt}\n[OUTPUT SCHEMA]\nYou MUST respond with valid JSON matching the output schema.\n{schema_str}\nResponse (JSON only, no other text):\n"""

            
            # Use Gemini's JSON mode or response_mime_type
            config = {
                "temperature": 0.8,  # Lower temperature for more accurate, less creative responses
                "system_instruction": self.personality,
                "response_mime_type": "application/json",
                "response_schema": schema_json,
            }

            logger.info(f"Enhanced prompt: {enhanced_prompt}")

            response = client.models.generate_content(
                model=model or settings.gemini_model,
                contents=enhanced_prompt,
                config=config,
            )

            # Parse and validate
            result = json.loads(response.text)
            validated = response_schema(**result)
            return validated.model_dump(mode="json")

        else:
            # Regular text completion
            # logging.info(f"Prompt: {prompt}")
        
            response = client.models.generate_content(
                model=model or settings.gemini_model,
                contents=prompt,
                config=config,
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
                "create_martini_example.txt",
                "create_old_fashioned_example.txt",
                "create_drink_example.txt",
                "search_drink_example.txt",
                "suggest_drink_example.txt",
                "create_drink_custom_example.txt",
            ],
            "retrieval_augmented": [
                "create_martini_example.txt",
                "create_old_fashioned_example.txt",
                "create_drink_example.txt",
                "search_drink_example.txt",
            ],
            "chat_style": ["create_drink_example.txt", "suggest_drink_example.txt"],
            "classic_completion": ["create_drink_example.txt"],
        }

        examples = []
        example_files = template_to_examples.get(template_name, [])

        for example_file in example_files:
            example_path = self.examples_dir / example_file
            try:
                if example_path.exists():
                    curr_example_str = ""
                    with open(example_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        curr_example_str += content
                        # self.logger.info(f"Content: {curr_example_str}")
                        
                    self.logger.debug(f"Loaded example from {example_file}")
                    examples.append(content)
                else:
                    self.logger.warning(f"Example file not found: {example_path}")
            except Exception as e:
                self.logger.error(f"Error reading example file {example_file}: {e}")

        # Cache examples for this template
        self._example_cache[template_name] = examples
        return examples
