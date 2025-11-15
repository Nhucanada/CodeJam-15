// Cocktail configuration types

export interface CocktailConfig {
  // Ingredients
  ingredients: Ingredient[]

  // Appearance
  glassType: GlassType
  liquidColor: string
  garnish: Garnish | null
  iceLevel: number // 0-1

  // Metadata
  name?: string
  id?: string
}

export interface Ingredient {
  name: string
  amount: number // in ml
  color: string
}

export type GlassType =
  | 'highball'
  | 'martini'
  | 'rocks'
  | 'coupe'
  | 'hurricane'

export type Garnish =
  | 'lemon'
  | 'lime'
  | 'orange'
  | 'cherry'
  | 'mint'
  | 'umbrella'
  | 'none'

export interface TabConfig {
  id: string
  label: string
  position: 'left' | 'right'
}

export type TabChangeCallback = (tabId: string) => void
export type ConfigChangeCallback = (config: CocktailConfig) => void
