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
  | 'zombie'
  | 'cocktail'
  | 'rocks'
  | 'hurricane'
  | 'pint'
  | 'seidel'
  | 'shot'
  | 'highball'
  | 'margarita'
  | 'martini'

export type Garnish =
  | 'lemon'
  | 'lime'
  | 'orange'
  | 'cherry'
  | 'olive'
  | 'salt_rim'
  | 'mint'
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
  | 'citrus_round'
  | 'mint'

// Mapping utilities to convert user-friendly types to renderer types
export const glassTypeToRenderer: Record<GlassType, RendererGlassName> = {
  zombie: 'zombie_glass_0',
  cocktail: 'cocktail_glass_1',
  rocks: 'rocks_glass_2',
  hurricane: 'hurricane_glass_3',
  pint: 'pint_glass_4',
  seidel: 'seidel_Glass_5',
  shot: 'shot_glass_6',
  highball: 'highball_glass_7',
  margarita: 'margarita_glass_8',
  martini: 'martini_glass_9',
}

export const garnishToRenderer: Record<Exclude<Garnish, 'none'>, RendererGarnishName> = {
  lemon: 'citrus_round',
  lime: 'citrus_round',
  orange: 'citrus_round',
  cherry: 'cherry',
  olive: 'olive',
  salt_rim: 'salt_rim',
  mint: 'mint',
}
