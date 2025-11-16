from typing import Callable, Dict, Any
from src.infra.agent_core.prompt import Prompt

from pydantic import BaseModel, Field

# --- Action Schema Models ---

class ActionSchema(BaseModel):
    action: str = Field(..., description="Type of AI action requested")
    input: str = Field(..., description="Input or context provided to the agent")
    output: str = Field(..., description="AI-generated response or completion")

# --- Prompt Prototype Pattern ---

def prompt_prototype_factory(
    _: str,
    *,
    description: str = "",
    system_message: str = "",
    instructions: str = ""
) -> Prompt:
    """
    Create a Prompt prototype with a structured set of segments, omitting USER INPUT.
    """
    segments = []
    if description:
        segments.append(f"[TASK DESCRIPTION]\n{description}")
    if system_message:
        segments.append(f"[SYSTEM]\n{system_message}")
    if instructions:
        segments.append(f"[INSTRUCTIONS]\n{instructions}")
    return Prompt("\n".join(segments))

# --- Prototype Prompt Registry ---

def get_classic_completion_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Freeform completion of text based on user input.",
        system_message=(
            "You are an intelligent assistant that thinks step-by-step. "
            "Always consider what tools, data sources, and other resources are available in the current context "
            "and how to use them effectively to produce the best possible answer."
        ),
        instructions=(
            "Let's approach this step by step:\n"
            "1. First, analyze the user's request and identify key components\n"
            "2. Think through the logical steps needed to address the request\n"
            "3. Consider any relevant context or constraints\n"
            "4. Formulate a clear and helpful response\n"
            "Put your reasoning in the 'reasoning' field and your response in the 'conversation' field of the JSON output."
        )
    )

def get_retrieval_augmented_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Answer with retrieved context from knowledge base or documentation.",
        system_message=(
            "You use external document retrieval to ground your answers and you are aware of all retrieval and "
            "knowledge resources that are available in the current context. Think through your reasoning step-by-step, "
            "explicitly considering which documents, tools, or APIs to use and why."
        ),
        instructions=(
            "Approach this systematically:\n"
            "1. Identify the key information needed from the retrieved context\n"
            "2. Analyze how the retrieved documents relate to the question\n"
            "3. Extract relevant facts and determine their reliability\n"
            "4. Synthesize the information into a coherent answer\n"
            "5. Cite sources and provide references for all claims\n"
            "Put your reasoning process in the 'reasoning' field and your final answer in the 'conversation' field of the JSON output."
        )
    )

def get_question_answering_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Question answering based on available data.",
        system_message=(
            "You answer questions concisely and accurately by reasoning through them step-by-step. "
            "Always inspect what contextual resources (retrieved documents, past interactions, tools, and APIs) are "
            "available, and use them when they can improve the quality or reliability of the answer."
        ),
        instructions=(
            "Think through this question carefully:\n"
            "1. What specifically is being asked?\n"
            "2. What information do I have that's relevant?\n"
            "3. What logical steps lead to the answer?\n"
            "4. Am I certain about this answer based on available data?\n"
            "If the answer is not known, explain your reasoning and state 'I don't know based on current data.'\n"
            "Put your thought process in the 'reasoning' field and your final answer in the 'conversation' field of the JSON output."
        )
    )

def get_action_generation_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Generate a structured action for an API call.",
        system_message=(
            "Generate JSON to represent the user's intended action. Think through the requirements step-by-step, and "
            "pay attention to what backend services, APIs, tools, and other resources are available so that the action "
            "is executable in the current environment."
        ),
        instructions=(
            "Let's break down the drink request:\n"
            "1. Analyze what the user wants:\n"
            "   - Specific drink by name? → action_type: 'create_drink' (populate drink_recipe)\n"
            "   - Describe preferences/mood? → action_type: 'suggest_drink' (populate suggest_drink)\n"
            "   - Ask about ingredients? → action_type: 'search_drink' (populate drink_recipe)\n\n"
            "2. For CREATE_DRINK or SUGGEST_DRINK, provide COMPLETE recipe:\n"
            "   - Name: The cocktail name\n"
            "   - Description: Brief description of the drink's character\n"
            "   - Ingredients: Each ingredient MUST have:\n"
            "     * name: Ingredient name (e.g., 'Bourbon', 'Simple Syrup')\n"
            "     * amount: Numeric amount (e.g., 60, 2, 0.5)\n"
            "     * unit: Unit of measurement (e.g., 'ml', 'oz', 'dash', 'tsp')\n"
            "     * color: Hex color code (e.g., '#D4A574' for bourbon, '#FFD700' for simple syrup)\n"
            "   - Instructions: Array of step-by-step preparation instructions\n"
            "   - Glass type: MUST be one of: 'zombie glass', 'cocktail glass', 'rocks glass', 'hurricane glass', 'pint glass', 'seidel glass', 'shot glass', 'highball glass', 'margarita glass', 'martini glass'\n"
            "   - Garnish: MUST be one of: 'lemon', 'lime', 'orange', 'cherry', 'olive', 'salt_rim', 'mint', or null for no garnish\n"
            "   - Has ice: true/false\n\n"
            "3. Respond in character as Arthur the bartender in the 'conversation' field\n\n"
            "4. Put your reasoning about which action_type to use in the 'reasoning' field\n\n"
            "CRITICAL: NEVER leave action_type as null. ALWAYS choose create_drink, suggest_drink, or search_drink."
        )
    )

def get_summarization_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Summarize user-provided content.",
        system_message=(
            "You summarize and rephrase user input for clarity by thinking through the content systematically. "
            "When helpful, take into account any available context, metadata, or other resources that can make the "
            "summary more accurate or useful."
        ),
        instructions=(
            "Follow this systematic approach:\n"
            "1. Read through the entire content to understand the main topic\n"
            "2. Identify the key points, themes, and critical information\n"
            "3. Determine what details are essential vs. supplementary\n"
            "4. Consider the intended audience and purpose\n"
            "5. Synthesize the information into a concise summary\n"
            "Put your analysis of key points in the 'reasoning' field, then provide a concise summary in the 'conversation' field of the JSON output."
        )
    )

def get_chat_style_prompt(_: str) -> Prompt:
    return prompt_prototype_factory(
        "",
        description="Multi-turn conversational assistant.",
        system_message=(
            "Respond in a friendly, helpful chat style. Think through your responses step-by-step. "
            "Continuously consider what contextual resources (conversation history, tools, APIs, and retrieved data) "
            "are available and how to use them to provide the most helpful, grounded reply."
        ),
        instructions=(
            "Let's think through this conversation carefully:\n"
            "1. What is the user asking or trying to accomplish?\n"
            "2. What context from previous turns is relevant?\n"
            "3. Are there any ambiguities that need clarification?\n"
            "4. What would be the most helpful response?\n"
            "5. How can I respond in a friendly and clear manner?\n"
            "Put your analysis in the 'reasoning' field, then provide a helpful and contextually appropriate response in the 'conversation' field of the JSON output."
        )
    )

# Map: name -> prototype retrieval function Singleton
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

