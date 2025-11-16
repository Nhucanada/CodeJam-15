"""Chat service for handling WebSocket chat operations with cocktail integration."""

import json
import logging
import re
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional
from uuid import UUID

from fastapi import WebSocket, status
from supabase import Client

from src.domain.auth_models import UserResponse
from src.domain.chat_models import (
    ConnectionResponse,
    ErrorMessage,
    IncomingMessage,
    MessageType,
    OutgoingMessage,
)
from src.domain.cocktail_models import CreateCocktailRequest
from src.infra.repositories.cocktail_repo import CocktailRepository
from src.services.auth_service import verify_access_token

logger = logging.getLogger(__name__)


# Enhanced models for cocktail integration
class CocktailMetadata:
    """Metadata for cocktail creation in chat responses."""

    def __init__(self, id: UUID, name: str, ingredients: List[Dict[str, Any]], recipe: str, description: Optional[str] = 
None):
        self.id = id
        self.name = name
        self.ingredients = ingredients
        self.recipe = recipe
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "name": self.name,
            "ingredients": self.ingredients,
            "recipe": self.recipe,
            "description": self.description
        }


class ChatMessageMetadata:
    """Extended metadata for chat messages."""

    def __init__(self, created_cocktail: Optional[CocktailMetadata] = None, 
                suggested_cocktails: Optional[List[str]] = None,
                action_type: Optional[str] = None):
        self.created_cocktail = created_cocktail
        self.suggested_cocktails = suggested_cocktails
        self.action_type = action_type

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        if self.created_cocktail:
            result["created_cocktail"] = self.created_cocktail.to_dict()
        if self.suggested_cocktails:
            result["suggested_cocktails"] = self.suggested_cocktails
        if self.action_type:
            result["action_type"] = self.action_type
        return result


class ChatSession:
    """Manages a single chat session for a user."""

    def __init__(self, user: UserResponse, session_id: str):
        self.user = user
        self.session_id = session_id
        self.message_count = 0

    def generate_message_id(self) -> str:
        """Generate unique message ID for this session."""
        self.message_count += 1
        return f"{self.session_id}-{self.message_count}"


async def authenticate_message(
    token: str,
    supabase: Client
) -> Optional[UserResponse]:
    """
    Authenticate a message using the provided token.
    
    Args:
        token: Access token to verify
        supabase: Supabase client instance
        
    Returns:
        UserResponse if authenticated, None otherwise
    """
    try:
        user_data = verify_access_token(token, supabase)
        if not user_data:
            return None

        from src.services.auth_service import _format_user_response
        return _format_user_response(user_data)
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        return None


async def create_error_message(
    error_type: str,
    detail: str,
    code: int = status.WS_1008_POLICY_VIOLATION,
    should_reconnect: bool = False,
    redirect_to: Optional[str] = None
) -> ErrorMessage:
    """
    Create an error message to send to client.
    
    Args:
        error_type: Type of error
        detail: Error details
        code: Error code
        should_reconnect: Whether client should attempt reconnect
        redirect_to: URL to redirect to
        
    Returns:
        ErrorMessage instance
    """
    return ErrorMessage(
        error=error_type,
        detail=detail,
        code=code,
        should_reconnect=should_reconnect,
        redirect_to=redirect_to
    )


async def extract_cocktail_from_response(
    response_text: str,
    user_id: UUID,
    supabase_client: Client
) -> Optional[CocktailMetadata]:
    """
    Extract cocktail creation data from agent response using pattern matching.
    
    Args:
        response_text: Agent response text
        user_id: Current user ID
        supabase_client: Supabase client
        
    Returns:
        CocktailMetadata if cocktail was created, None otherwise
    """
    try:
        # Pattern to detect cocktail creation
        creation_patterns = [
            r"I've created (?:a |an |the )?(.+?) (?:for you|cocktail)",
            r"I made (?:a |an |the )?(.+?) (?:for you|cocktail)",
            r"Here's your (.+?) recipe",
            r"(?:Created|Made) (?:a |an |the )?(.+?)(?:\.|!|$)"
        ]

        cocktail_name = None
        for pattern in creation_patterns:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                cocktail_name = match.group(1).strip()
                break

        if not cocktail_name:
            return None

        # Extract ingredients using pattern matching
        ingredients = extract_ingredients_from_text(response_text)

        if not ingredients:
            return None

        # Extract recipe/instructions
        recipe = extract_recipe_from_text(response_text)

        # Create the cocktail in database
        cocktail_repo = CocktailRepository(supabase_client)

        # Convert ingredient text to structured format
        structured_ingredients = await convert_ingredients_to_structured_format(
            ingredients, supabase_client
        )

        if not structured_ingredients:
            logger.warning(f"Could not structure ingredients for cocktail: {cocktail_name}")
            return None

        # Create cocktail request
        create_request = CreateCocktailRequest(
            name=cocktail_name,
            description=f"Created by Arthur AI assistant",
            ingredients=structured_ingredients,
            has_ice="ice" in response_text.lower()
        )

        # Create in database
        created_cocktail = await cocktail_repo.create_cocktail(create_request, user_id)

        if created_cocktail:
            return CocktailMetadata(
                id=created_cocktail.id,
                name=created_cocktail.name,
                ingredients=[
                    {
                        "name": ing.name,
                        "quantity": float(ing.quantity),
                        "unit": ing.unit,
                        "hexcode": ing.hexcode
                    }
                    for ing in created_cocktail.ingredients
                ],
                recipe=recipe,
                description=created_cocktail.description
            )

        return None

    except Exception as e:
        logger.error(f"Error extracting cocktail from response: {e}")
        return None


def extract_ingredients_from_text(text: str) -> List[str]:
    """Extract ingredient mentions from text."""
    ingredient_patterns = [
        r"(\d+(?:\.\d+)?\s*(?:oz|ml|cl|tsp|tbsp|dash|splash)?\s+(?:of\s+)?[\w\s]+)",
        r"([\w\s]+:\s*\d+(?:\.\d+)?\s*(?:oz|ml|cl|tsp|tbsp))",
    ]

    ingredients = []
    for pattern in ingredient_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        ingredients.extend(matches)

    return ingredients


def extract_recipe_from_text(text: str) -> str:
    """Extract recipe/instructions from text."""
    instruction_keywords = ["mix", "shake", "stir", "pour", "add", "combine", "strain", "garnish", "serve"]

    sentences = text.split('.')
    recipe_sentences = []

    for sentence in sentences:
        if any(keyword in sentence.lower() for keyword in instruction_keywords):
            recipe_sentences.append(sentence.strip())

    return '. '.join(recipe_sentences) if recipe_sentences else "Cocktail preparation instructions."


async def convert_ingredients_to_structured_format(
    ingredient_texts: List[str],
    supabase_client: Client
) -> List[Dict[str, Any]]:
    """
    Convert ingredient text descriptions to structured format for database.
    """
    try:
        structured = []

        for ingredient_text in ingredient_texts:
            parts = ingredient_text.strip().split()
            if len(parts) < 2:
                continue

            try:
                quantity = float(parts[0])

                # Find unit
                unit = ""
                name_parts = []

                for i, part in enumerate(parts[1:], 1):
                    if part.lower() in ["oz", "ml", "cl", "tsp", "tbsp", "dash", "splash"]:
                        unit = part.lower()
                        name_parts = parts[i+1:]
                        break
                    elif i == 1:  # No unit found, assume first word after quantity
                        name_parts = parts[i:]
                        break

                if not name_parts:
                    continue

                ingredient_name = " ".join(name_parts).replace("of", "").strip()

                # Look up ingredient in database
                ingredient_response = supabase_client.table("ingredient").select("id").ilike(
                    "name", f"%{ingredient_name}%"
                ).limit(1).execute()

                if ingredient_response.data:
                    ingredient_id = ingredient_response.data[0]["id"]
                    structured.append({
                        "ingredient_id": ingredient_id,
                        "quantity": quantity,
                        "unit": unit or "oz"
                    })
                else:
                    # Create new ingredient if not found
                    new_ingredient = supabase_client.table("ingredient").insert({
                        "name": ingredient_name
                    }).execute()

                    if new_ingredient.data:
                        structured.append({
                            "ingredient_id": new_ingredient.data[0]["id"],
                            "quantity": quantity,
                            "unit": unit or "oz"
                        })

            except ValueError:
                continue

        return structured

    except Exception as e:
        logger.error(f"Error converting ingredients to structured format: {e}")
        return []


async def process_agent_response_with_cocktail_detection(
    agent_response: str,
    user_id: UUID,
    supabase_client: Client,
    message_id: str
) -> Dict[str, Any]:
    """
    Process agent response and detect cocktail creation instructions.
    
    Args:
        agent_response: The full agent response text
        user_id: Current user ID
        supabase_client: Supabase client for database operations
        message_id: Unique message identifier
        
    Returns:
        Enhanced message dict with potential cocktail metadata
    """
    try:
        # Check if response contains cocktail creation markers
        cocktail_metadata = await extract_cocktail_from_response(agent_response, user_id, supabase_client)

        # Determine action type
        action_type = None
        if cocktail_metadata:
            action_type = "cocktail_created"
        elif "recipe" in agent_response.lower() and any(word in agent_response.lower() for word in ["mix", "shake", "stir",
"pour"]):
            action_type = "recipe_shared"

        # Build metadata
        chat_metadata = ChatMessageMetadata(
            created_cocktail=cocktail_metadata,
            action_type=action_type
        )

        message_dict = {
            "type": MessageType.STREAM_END,
            "message_id": message_id,
            "content": agent_response,
            "complete": True
        }

        # Add metadata if present
        metadata_dict = chat_metadata.to_dict()
        if metadata_dict:
            message_dict["metadata"] = metadata_dict

        return message_dict

    except Exception as e:
        logger.error(f"Error processing agent response: {e}")
        return {
            "type": MessageType.STREAM_END,
            "message_id": message_id,
            "content": agent_response,
            "complete": True
        }


async def process_user_message(
    message: IncomingMessage,
    session: ChatSession,
    supabase: Client
) -> AsyncGenerator[OutgoingMessage, None]:
    """
    Process a user message and generate AI response with cocktail detection.
    
    Args:
        message: Incoming user message
        session: Current chat session
        supabase: Supabase client instance
        
    Yields:
        OutgoingMessage instances (streaming response)
    """
    try:
        # Generate unique message ID
        message_id = session.generate_message_id()

        # Send stream start
        yield OutgoingMessage(
            type=MessageType.STREAM_START,
            message_id=message_id,
            metadata={"user_id": str(session.user.id)}
        )

        # TODO: Integrate with actual agentic RAG service here
        # For now, simulate an AI response that might create a cocktail
        if message.content:
            # Simulate different types of responses based on content
            if "cocktail" in message.content.lower() or "drink" in message.content.lower():
                response_text = f"I've created a Manhattan for you! Here's the recipe: 2 oz rye whiskey, 1 oz sweet vermouth,  2 dashes Angostura bitters. Stir with ice and strain into a chilled coupe glass. Garnish with a cherry."
            else:
                response_text = f"Received your message: {message.content}"

            # Stream the response in chunks
            chunk_size = 10
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i + chunk_size]
                yield OutgoingMessage(
                    type=MessageType.STREAM_DELTA,
                    message_id=message_id,
                    delta=chunk,
                    complete=False
                )
        else:
            response_text = "No content provided"

        # Process response for cocktail creation and send enhanced stream end
        enhanced_message_dict = await process_agent_response_with_cocktail_detection(
            response_text,
            session.user.id,
            supabase,
            message_id
        )

        # Convert dict to OutgoingMessage
        yield OutgoingMessage(**enhanced_message_dict)

    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        yield OutgoingMessage(
            type=MessageType.ERROR,
            message_id=session.generate_message_id(),
            content=f"Failed to process message: {str(e)}"
        )


async def handle_chat_connection(
    websocket: WebSocket,
    initial_token: str,
    supabase: Client
) -> Optional[ChatSession]:
    """
    Handle initial WebSocket connection and authentication.
    
    Args:
        websocket: WebSocket connection
        initial_token: Access token from query params
        supabase: Supabase client instance
        
    Returns:
        ChatSession if authenticated, None otherwise
    """
    try:
        # Authenticate user
        user = await authenticate_message(initial_token, supabase)

        if not user:
            error_msg = await create_error_message(
                error_type="authentication_failed",
                detail="Invalid or expired authentication token",
                code=status.WS_1008_POLICY_VIOLATION,
                should_reconnect=False,
                redirect_to="/login"
            )
            await websocket.send_json(error_msg.model_dump())
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None

        # Create session
        session_id = str(uuid.uuid4())
        session = ChatSession(user=user, session_id=session_id)

        # Send connection confirmation
        connection_msg = ConnectionResponse(
            user_id=user.id,
            session_id=session_id
        )
        await websocket.send_json(connection_msg.model_dump())

        logger.info(f"User {user.id} connected to chat session {session_id}")
        return session

    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        error_msg = await create_error_message(
            error_type="connection_failed",
            detail=f"Failed to establish connection: {str(e)}",
            code=status.WS_1011_INTERNAL_ERROR
        )
        await websocket.send_json(error_msg.model_dump())
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return None


async def handle_message(
    message_data: dict,
    session: ChatSession,
    websocket: WebSocket,
    supabase: Client
) -> bool:
    """
    Handle incoming message from client with enhanced cocktail support.
    
    Args:
        message_data: Raw message data from client
        session: Current chat session
        websocket: WebSocket connection
        supabase: Supabase client instance
        
    Returns:
        True if connection should continue, False if it should close
    """
    try:
        # Parse incoming message
        message = IncomingMessage(**message_data)

        # Re-authenticate if token is provided in message
        if message.token:
            user = await authenticate_message(message.token, supabase)
            if not user:
                error_msg = await create_error_message(
                    error_type="authentication_expired",
                    detail="Your session has expired. Please log in again.",
                    code=status.WS_1008_POLICY_VIOLATION,
                    should_reconnect=False,
                    redirect_to="/login"
                )
                await websocket.send_json(error_msg.model_dump())
                return False

            # Verify it's the same user
            if user.id != session.user.id:
                error_msg = await create_error_message(
                    error_type="authentication_mismatch",
                    detail="User identity mismatch. Connection terminated.",
                    code=status.WS_1008_POLICY_VIOLATION,
                    should_reconnect=False,
                    redirect_to="/login"
                )
                await websocket.send_json(error_msg.model_dump())
                return False

        # Process message based on type
        if message.type == MessageType.USER or message.type == "user":
            # Process user message and stream response
            async for response in process_user_message(message, session, supabase):
                await websocket.send_json(response.model_dump())

        elif message.type == MessageType.TYPING:
            # Handle typing indicator (could broadcast to other participants)
            pass

        else:
            logger.warning(f"Unknown message type: {message.type}")

        return True

    except Exception as e:
        logger.error(f"Error handling message: {str(e)}")
        error_msg = await create_error_message(
            error_type="message_processing_failed",
            detail=f"Failed to process message: {str(e)}",
            code=status.WS_1011_INTERNAL_ERROR
        )
        await websocket.send_json(error_msg.model_dump())
        return True  # Continue connection despite error