import type { CocktailConfig } from '../types'

export const exampleCocktails: CocktailConfig[] = [
  {
    name: 'Mojito',
    id: 'mojito',
    glassType: 'highball',
    liquidColor: '#98FB98',
    garnish: 'mint',
    hasIce: true,
    ingredients: [
      { name: 'White Rum', amount: 50, color: '#ffffff' },
      { name: 'Lime Juice', amount: 30, color: '#9ACD32' },
      { name: 'Mint', amount: 10, color: '#98FB98' },
      { name: 'Soda Water', amount: 60, color: '#e8f4f8' },
    ],
  },
  {
    name: 'Classic Martini',
    id: 'martini',
    glassType: 'martini',
    liquidColor: '#F0E68C',
    garnish: 'olive',
    hasIce: false,
    ingredients: [
      { name: 'Gin', amount: 60, color: '#F0E68C' },
      { name: 'Dry Vermouth', amount: 10, color: '#F5DEB3' },
    ],
  },
  {
    name: 'Old Fashioned',
    id: 'old-fashioned',
    glassType: 'rocks',
    liquidColor: '#D2691E',
    garnish: 'orange',
    hasIce: true,
    ingredients: [
      { name: 'Bourbon', amount: 60, color: '#D2691E' },
      { name: 'Simple Syrup', amount: 10, color: '#FFE4B5' },
      { name: 'Bitters', amount: 2, color: '#8B4513' },
    ],
  },
  {
    name: 'Margarita',
    id: 'margarita',
    glassType: 'margarita',
    liquidColor: '#FFDAB9',
    garnish: 'salt_rim',
    hasIce: false,
    ingredients: [
      { name: 'Tequila', amount: 50, color: '#F5DEB3' },
      { name: 'Lime Juice', amount: 25, color: '#9ACD32' },
      { name: 'Triple Sec', amount: 25, color: '#FFE4B5' },
    ],
  },
  {
    name: 'Manhattan',
    id: 'manhattan',
    glassType: 'martini',
    liquidColor: '#8B4513',
    garnish: 'cherry',
    hasIce: false,
    ingredients: [
      { name: 'Rye Whiskey', amount: 60, color: '#8B4513' },
      { name: 'Sweet Vermouth', amount: 30, color: '#A0522D' },
      { name: 'Bitters', amount: 2, color: '#654321' },
    ],
  },
  {
    name: 'Piña Colada',
    id: 'pina-colada',
    glassType: 'hurricane',
    liquidColor: '#FFFACD',
    garnish: 'cherry',
    hasIce: true,
    ingredients: [
      { name: 'White Rum', amount: 50, color: '#ffffff' },
      { name: 'Coconut Cream', amount: 30, color: '#FFFACD' },
      { name: 'Pineapple Juice', amount: 90, color: '#FFD700' },
    ],
  },
]
