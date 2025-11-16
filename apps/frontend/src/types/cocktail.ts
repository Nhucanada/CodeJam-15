export interface CocktailSummary {
id: string;
name: string;
ingredients_summary: string;
created_at: string;
}

export interface CocktailIngredient {
id: string;
name: string;
quantity: number;
unit: string;
abv?: number;
flavor_profile?: string;
hexcode?: string;
}

export interface CocktailDetail {
id: string;
name: string;
type?: string;
description?: string;
has_ice: boolean;
created_at: string;
ingredients: CocktailIngredient[];
garnishes: Array<{id: string; name: string; asset?: string}>;
}

// Backend agent action types
export type ActionType = 'create_drink' | 'search_drink' | 'suggest_drink';

// Backend drink ingredient schema
export interface DrinkIngredient {
  name: string;
  amount: number;
  color: string; // hex code
  unit: string;
}

// Backend drink recipe schema
export interface DrinkRecipeSchema {
  name: string;
  description: string;
  ingredients: DrinkIngredient[];
  instructions: string[];
  glass_type?: string;
  garnish?: string | null;
  has_ice?: boolean;
}

// Backend agent action response
export interface AgentActionResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  action_type: ActionType | null;
  confidence: number;
  reasoning: string;
  conversation: string;
  drink_recipe?: DrinkRecipeSchema | null;
  suggest_drink?: DrinkRecipeSchema | null;
}

export interface EnhancedChatMessage {
type: string;
message_id?: string;
content?: string | AgentActionResponse; // Can be either text or agent action object
delta?: string;
complete: boolean;
metadata?: {
    created_cocktail?: {
    id: string;
    name: string;
    ingredients: Array<{name: string; quantity: number; unit: string; hexcode?: string}>;
    recipe: string;
    description?: string;
    };
    action_type?: 'cocktail_created' | 'recipe_shared' | ActionType;
    agent_action?: AgentActionResponse;
};
}