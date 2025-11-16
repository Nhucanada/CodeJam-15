# Few-Shot Examples for AgenticEngine

This directory contains few-shot examples that guide the AgenticEngine in generating structured action schemas from conversation history.

## Purpose

Few-shot examples help the language model understand:
- How to interpret conversation context
- How to map user intent to action types
- How to structure responses according to the `AgentActionSchema`
- How to generate complete drink recipes with proper formatting

## File Structure

Each example file follows this format:

```
CONVERSATION:
[Conversation history between user and Arthur]

EXPECTED_OUTPUT:
[JSON-formatted AgentActionSchema]
```

## Example Files

### Action Generation Examples

- **create_drink_example.txt**: Classic cocktail creation (Mojito)
  - Shows explicit drink requests
  - Demonstrates complete recipe generation
  - Action type: `create_drink`

- **create_drink_custom_example.txt**: Custom cocktail creation (Cucumber Cooler)
  - Shows requests with ingredient preferences
  - Demonstrates creative recipe generation
  - Action type: `create_drink`

- **search_drink_example.txt**: Drink search by ingredients
  - Shows exploratory queries
  - Demonstrates search intent detection
  - Action type: `search_drink`

- **suggest_drink_example.txt**: Drink suggestion (Piña Colada)
  - Shows preference-based requests
  - Demonstrates recommendation logic
  - Action type: `suggest_drink`

## Schema Reference

Examples must conform to `AgentActionSchema` from `src/domain/agent_models.py`:

### Required Fields
- `id`: Unique identifier (string)
- `name`: Action name (string)
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp
- `action_type`: One of: `create_drink`, `search_drink`, `suggest_drink`
- `confidence`: Float between 0-1
- `reasoning`: Explanation for the action (max 1000 chars)
- `conversation`: What Arthur says to the user (max 1000 chars)

### Optional Fields
- `drink_recipe`: Full recipe (for `create_drink` actions)
- `suggest_drink`: Recipe suggestion (for `suggest_drink` actions)

### DrinkRecipeSchema
- `name`: Drink name
- `description`: Brief description (max 500 chars)
- `ingredients`: Array of `DrinkIngredient` objects
  - `name`: Ingredient name
  - `amount`: Numeric amount (> 0)
  - `color`: Hex color code (e.g., "#ffffff")
  - `unit`: Unit of measurement (e.g., "ml", "g")
- `instructions`: Array of instruction strings
- `glass_type`: Type of glass (default: "rocks glass")
- `garnish`: Garnish description (optional, max 100 chars)
- `has_ice`: Boolean (default: true)

## Template Mapping

The `_get_few_shot_examples()` method maps templates to example files:

- **action_generation**: All four examples
- **retrieval_augmented**: create_drink, search_drink
- **chat_style**: create_drink, suggest_drink
- **classic_completion**: create_drink only

## Adding New Examples

To add new examples:

1. Create a `.txt` file following the format above
2. Ensure JSON output matches `AgentActionSchema`
3. Add the filename to the template mapping in `engine.py`
4. Test with the specific template to verify behavior

## Best Practices

- **Be specific**: Show clear conversation patterns
- **Be diverse**: Cover different user intents and phrasings
- **Be realistic**: Use natural conversation flow
- **Be accurate**: Ensure schema compliance and valid JSON
- **Be complete**: Include all required fields with appropriate values

