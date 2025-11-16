from typing import Callable, Dict, Any
from src.infra.agent_core.prompt import Prompt

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
        system_message="You are an intelligent assistant that thinks step-by-step.",
        instructions=(
            "Let's approach this step by step:\n"
            "1. First, analyze the user's request and identify key components\n"
            "2. Think through the logical steps needed to address the request\n"
            "3. Consider any relevant context or constraints\n"
            "4. Formulate a clear and helpful response\n"
            "Show your reasoning, then provide the final answer."
        )
    )

def get_retrieval_augmented_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Answer with retrieved context from knowledge base or documentation.",
        system_message="You use external document retrieval to ground your answers. Think through your reasoning step-by-step.",
        instructions=(
            "Approach this systematically:\n"
            "1. Identify the key information needed from the retrieved context\n"
            "2. Analyze how the retrieved documents relate to the question\n"
            "3. Extract relevant facts and determine their reliability\n"
            "4. Synthesize the information into a coherent answer\n"
            "5. Cite sources and provide references for all claims\n"
            "Show your reasoning process before presenting the final answer."
        )
    )

def get_question_answering_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Question answering based on available data.",
        system_message="You answer questions concisely and accurately by reasoning through them step-by-step.",
        instructions=(
            "Think through this question carefully:\n"
            "1. What specifically is being asked?\n"
            "2. What information do I have that's relevant?\n"
            "3. What logical steps lead to the answer?\n"
            "4. Am I certain about this answer based on available data?\n"
            "If the answer is not known, explain your reasoning and state 'I don't know based on current data.'\n"
            "Show your thought process, then provide your final answer."
        )
    )

def get_action_generation_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Generate a structured action for an API call.",
        system_message="Generate JSON to represent the user's intended action. Think through the requirements step-by-step.",
        instructions=(
            "Let's break down the action generation:\n"
            "1. Analyze what the user wants to accomplish\n"
            "2. Identify the appropriate action type for this intent\n"
            "3. Determine all required input parameters and their values\n"
            "4. Define the expected output schema\n"
            "5. Validate that the action structure is complete and correct\n"
            "Show your reasoning process, then respond with the structured JSON containing action type, input parameters, and expected output schema."
        )
    )

def get_summarization_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Summarize user-provided content.",
        system_message="You summarize and rephrase user input for clarity by thinking through the content systematically.",
        instructions=(
            "Follow this systematic approach:\n"
            "1. Read through the entire content to understand the main topic\n"
            "2. Identify the key points, themes, and critical information\n"
            "3. Determine what details are essential vs. supplementary\n"
            "4. Consider the intended audience and purpose\n"
            "5. Synthesize the information into a concise summary\n"
            "Show your analysis of key points, then provide a concise summary with only the most important information."
        )
    )

def get_chat_style_prompt(user_input: str) -> Prompt:
    return prompt_prototype_factory(
        user_input,
        description="Multi-turn conversational assistant.",
        system_message="Respond in a friendly, helpful chat style. Think through your responses step-by-step.",
        instructions=(
            "Let's think through this conversation carefully:\n"
            "1. What is the user asking or trying to accomplish?\n"
            "2. What context from previous turns is relevant?\n"
            "3. Are there any ambiguities that need clarification?\n"
            "4. What would be the most helpful response?\n"
            "5. How can I respond in a friendly and clear manner?\n"
            "Consider the conversation flow, then provide a helpful and contextually appropriate response."
        )
    )

# Map: name -> prototype retrieval function  Singleton
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

