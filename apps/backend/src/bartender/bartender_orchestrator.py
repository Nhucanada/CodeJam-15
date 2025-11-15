import json
from typing import Any, Dict, List

from bartender.llm_client import model
from cocktaildb.cocktail_db import SessionLocal, Cocktail
from saq import get_first_saq_url

def get_candidate_cocktails(limit: int = 15) -> List[Dict[str, Any]]:
    """Pull a small set of cocktails from the database for the LLM to choose from."""
    db = SessionLocal()
    try:
        cocktails = (
            db.query(Cocktail)
            .order_by(Cocktail.id)
            .limit(limit)
            .all()
        )
        return [
            {
                "id": c.id,
                "name": c.name,
                "type": c.type,
                # you can add more later: tags, ingredients, etc.
            }
            for c in cocktails
        ]
    finally:
        db.close()

def generate_cocktail_with_llm(user_prefs: Dict[str, Any],
                               candidate_cocktails: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Ask Gemini to pick (or slightly riff on) a cocktail and return structured JSON:
    {
      "cocktail_name": string,
      "reasoning": string,
      "steps": [string, ...],
      "liquor_queries": [string, ...]
    }
    """
    system_instructions = """
    You are an expert cocktail bartender AI.

    You will receive:
    - user_preferences: what the guest likes/dislikes
    - candidate_cocktails: cocktails from our database (id, name, type)

    Pick ONE cocktail from the list (or a very close variation)
    and output a JSON object with exactly this shape:

    {
      "cocktail_name": string,
      "reasoning": string,
      "steps": [string, ...],
      "liquor_queries": [string, ...]
    }

    "steps" should be a detailed, bartender-style recipe.
    "liquor_queries" should be generic liquor names like
    "Bourbon", "Rye whiskey", "London Dry Gin", "Campari".

    IMPORTANT:
    - Do NOT include any extra text, no code fences.
    - Respond with RAW JSON only.
    """

    prompt = f"""
    user_preferences = {json.dumps(user_prefs, ensure_ascii=False)}

    candidate_cocktails = {json.dumps(candidate_cocktails, ensure_ascii=False)}
    """

    resp = model.generate_content(
        [
            {"role": "system", "parts": [system_instructions]},
            {"role": "user", "parts": [prompt]},
        ]
    )

    text = resp.text.strip()
    return json.loads(text)

def attach_saq_links(structured: Dict[str, Any]) -> Dict[str, Any]:
    """
    For each liquor query the LLM gave us, fetch an SAQ URL.
    """
    liquor_queries = structured.get("liquor_queries", [])
    saq_items = []

    for q in liquor_queries:
        try:
            url = get_first_saq_url(q)  # from your GraphQL code
        except Exception as e:
            url = None
        saq_items.append({
            "query": q,
            "saq_url": url,
        })

    structured["saq_items"] = saq_items
    return structured

def make_cocktail_for_user(user_prefs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main brain:
      - get some candidate cocktails from DB
      - ask Gemini to pick & build recipe
      - attach SAQ links for the spirits/liqueurs
    """
    candidates = get_candidate_cocktails()
    structured = generate_cocktail_with_llm(user_prefs, candidates)
    structured = attach_saq_links(structured)
    return structured

