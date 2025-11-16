// Cocktail configuration types

export interface CocktailConfig {
  // Ingredients
  ingredients: Ingredient[]

  // Appearance
  glassType: GlassType
  liquidColor: string
  garnish: Garnish | null
  hasIce: boolean

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

// Renderer types (internal 3D scene types)
export type RendererGlassName =
  | 'zombie_glass_0'
  | 'cocktail_glass_1'
  | 'rocks_glass_2'
  | 'hurricane_glass_3'
  | 'pint_glass_4'
  | 'seidel_Glass_5'
  | 'shot_glass_6'
  | 'highball_glass_7'
  | 'margarita_glass_8'
  | 'martini_glass_9'

export type RendererGarnishName =
  | 'cherry'
  | 'olive'
  | 'salt_rim'
  | 'orange_round'
  | 'mint'

// Mapping utilities to convert user-friendly types to renderer types
export const glassTypeToRenderer: Record<GlassType, RendererGlassName> = {
  highball: 'highball_glass_7',
  martini: 'martini_glass_9',
  rocks: 'rocks_glass_2',
  coupe: 'cocktail_glass_1',
  hurricane: 'hurricane_glass_3',
}

export const garnishToRenderer: Record<Exclude<Garnish, 'none'>, RendererGarnishName | null> = {
  lemon: 'orange_round', // Using orange_round as closest match
  lime: 'orange_round', // Using orange_round as closest match
  orange: 'orange_round',
  cherry: 'cherry',
  mint: 'mint',
  umbrella: null, // Not supported by renderer
}
