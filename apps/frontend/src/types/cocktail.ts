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

export interface EnhancedChatMessage {
type: string;
message_id?: string;
content?: string;
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
    action_type?: 'cocktail_created' | 'recipe_shared';
};
}