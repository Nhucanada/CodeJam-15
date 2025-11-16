import type { DrinkRecipeSchema } from '../types/cocktail';
import type { CocktailConfig, GlassType, Garnish } from '../types';
import * as THREE from 'three';

/**
 * Maps backend drink recipe to frontend cocktail configuration
 */
export function mapBackendDrinkToFrontend(drink: DrinkRecipeSchema): CocktailConfig {
  console.log('[DRINK MAPPER] ========== mapBackendDrinkToFrontend ==========');
  console.log('[DRINK MAPPER] Input drink:', drink);
  console.log('[DRINK MAPPER] Input glass_type:', drink.glass_type);
  console.log('[DRINK MAPPER] Input garnish:', drink.garnish);
  console.log('[DRINK MAPPER] Input has_ice:', drink.has_ice);
  console.log('[DRINK MAPPER] Input ingredients:', drink.ingredients);

  const mappedGlassType = mapGlassType(drink.glass_type);
  console.log('[DRINK MAPPER] Mapped glassType:', mappedGlassType);

  const ingredientColors = drink.ingredients.map(i => i.color);
  console.log('[DRINK MAPPER] Ingredient colors:', ingredientColors);

  const liquidColor = calculateLiquidColor(ingredientColors);
  console.log('[DRINK MAPPER] Calculated liquidColor:', liquidColor);

  const mappedGarnish = mapGarnish(drink.garnish);
  console.log('[DRINK MAPPER] Mapped garnish:', mappedGarnish);

  const hasIce = drink.has_ice ?? true;
  console.log('[DRINK MAPPER] Has ice:', hasIce);

  const result = {
    ingredients: drink.ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      color: ing.color
    })),
    glassType: mappedGlassType,
    liquidColor: liquidColor,
    garnish: mappedGarnish,
    hasIce: hasIce,
    name: drink.name
  };

  console.log('[DRINK MAPPER] Output result:', result);
  return result;
}

/**
 * Maps backend glass type string to frontend GlassType
 */
function mapGlassType(glassType?: string): GlassType {
  if (!glassType) return 'rocks';

  const glassLower = glassType.toLowerCase();

  // Map common glass type variations
  if (glassLower.includes('zombie')) return 'zombie';
  if (glassLower.includes('cocktail')) return 'cocktail';
  if (glassLower.includes('rocks') || glassLower.includes('old fashioned')) return 'rocks';
  if (glassLower.includes('hurricane')) return 'hurricane';
  if (glassLower.includes('pint')) return 'pint';
  if (glassLower.includes('seidel') || glassLower.includes('stein')) return 'seidel';
  if (glassLower.includes('shot')) return 'shot';
  if (glassLower.includes('highball') || glassLower.includes('collins')) return 'highball';
  if (glassLower.includes('margarita')) return 'margarita';
  if (glassLower.includes('martini')) return 'martini';

  // Default fallback
  return 'rocks';
}

/**
 * Maps backend garnish string to frontend Garnish type
 */
function mapGarnish(garnish?: string | null): Garnish | null {
  if (!garnish) return null;

  const garnishLower = garnish.toLowerCase();

  if (garnishLower.includes('lemon')) return 'lemon';
  if (garnishLower.includes('lime')) return 'lime';
  if (garnishLower.includes('orange')) return 'orange';
  if (garnishLower.includes('cherry')) return 'cherry';
  if (garnishLower.includes('olive')) return 'olive';
  if (garnishLower.includes('salt')) return 'salt_rim';
  if (garnishLower.includes('mint')) return 'mint';

  return null;
}

/**
 * Calculates the dominant liquid color from ingredient colors
 * Uses weighted average based on visual appearance
 */
function calculateLiquidColor(colors: string[]): string {
  if (colors.length === 0) return '#ffffff';
  if (colors.length === 1) return colors[0];

  // Convert hex colors to THREE.Color and blend
  const threeColors = colors.map(hex => new THREE.Color(hex));

  let r = 0, g = 0, b = 0;
  threeColors.forEach(color => {
    r += color.r;
    g += color.g;
    b += color.b;
  });

  const count = threeColors.length;
  const avgColor = new THREE.Color(r / count, g / count, b / count);

  return '#' + avgColor.getHexString();
}
