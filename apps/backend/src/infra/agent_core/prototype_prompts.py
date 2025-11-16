from typing import Callable, Dict, Any
from infra.agent_core.prompt import Prompt

from pydantic import BaseModel, Field

# --- Action Schema Models ---

class ActionSchema(BaseModel):
    action: str = Field(..., description="Type of AI action requested")
    input: str = Field(..., description="Input or context provided to the agent")
    output: str = Field(..., description="AI-generated response or completion")

# --- Prompt Prototype Pattern ---

def prompt_prototype_factory(base: str, *, description: str = "", system_message: str = "", instructions: str = "") -> Prompt:
    """
    Create a Prompt prototype with a structured set of segments.
    """
    segments = []
    if description:
        segments.append(f"[TASK DESCRIPTION]\n{description}")
    if system_message:
        segments.append(f"[SYSTEM]\n{system_message}")
    if instructions:
        segments.append(f"[INSTRUCTIONS]\n{instructions}")
    if base:
        segments.append(f"[USER INPUT]\n{base}")
    return Prompt("\n".join(segments))

# --- Prototype Prompt Registry ---

def get_classic_completion_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Freeform completion of text based on user input.",
        system_message="You are an intelligent assistant.",
        instructions="Given the user input, provide a helpful and complete response."
    )

def get_retrieval_augmented_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Answer with retrieved context from knowledge base or documentation.",
        system_message="You use external document retrieval to ground your answers.",
        instructions="Cite sources and provide references when possible."
    )

def get_question_answering_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Question answering based on available data.",
        system_message="You answer questions concisely and accurately.",
        instructions="If the answer is not known, say 'I don't know based on current data.'"
    )

def get_action_generation_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Generate a structured action for an API call.",
        system_message="Generate JSON to represent the user's intended action.",
        instructions="Respond with an action type, input parameters, and expected output schema."
    )

def get_summarization_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Summarize user-provided content.",
        system_message="You summarize and rephrase user input for clarity.",
        instructions="Keep summaries concise and include only the most important points."
    )

def get_chat_style_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Multi-turn conversational assistant.",
        system_message="Respond in a friendly, helpful chat style.",
        instructions="Maintain context and clarify ambiguous questions."
    )

# Map: name -> prototype retrieval function
PROMPT_PROTOTYPE_REGISTRY: Dict[str, Callable[[str], Prompt]] = {
    "classic_completion": get_classic_completion_prompt,
    "retrieval_augmented": get_retrieval_augmented_prompt,
    "question_answering": get_question_answering_prompt,
    "action_generation": get_action_generation_prompt,
    "summarization": get_summarization_prompt,
    "chat_style": get_chat_style_prompt,
}

def get_prompt_prototype(prototype_name: str, user_input: str) -> Prompt:
    """
    Retrieve a Prompt object for the given prototype name and user input.
    """
    fn = PROMPT_PROTOTYPE_REGISTRY.get(prototype_name)
    if not fn:
        raise ValueError(f"No prompt prototype registered under name '{prototype_name}'.")
    return fn(user_input)

# --- Example: Compose an action schema output from a prompt ---

def render_action_schema(prompt: Prompt, action: str, output: str) -> ActionSchema:
    """
    Compose a standardized ActionSchema for returning to the front-end.
    """
    return ActionSchema(
        action=action,
        input=prompt.as_string(),
        output=output
    )

