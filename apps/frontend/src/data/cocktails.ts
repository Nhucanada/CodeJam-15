import type { CocktailConfig } from '../types'

export const exampleCocktails: CocktailConfig[] = [
  {
    name: 'Water',
    id: 'water',
    glassType: 'highball',
    liquidColor: '#ADD8E6',
    garnish: null,
    hasIce: true,
    ingredients: [
      { name: 'Water', amount: 250, color: '#ADD8E6' },
    ],
  },
  {
    name: 'Mojito',
    id: 'mojito',
    glassType: 'highball',
    liquidColor: '#98FB98',
    garnish: 'mint',
    hasIce: true,
    description: 'A refreshing Cuban cocktail with rum, mint, and lime.',
    instructions: [
      'Muddle fresh mint leaves with sugar and lime juice in a highball glass',
      'Fill glass with ice cubes',
      'Pour white rum over ice',
      'Top with soda water and stir gently',
      'Garnish with fresh mint sprig'
    ],
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
    liquidColor: '#fffbd9ff',
    garnish: 'olive',
    hasIce: false,
    description: 'The quintessential cocktail - elegant, dry, and timeless.',
    instructions: [
      'Fill a mixing glass with ice',
      'Add gin and dry vermouth',
      'Stir gently for 30 seconds',
      'Strain into a chilled martini glass',
      'Garnish with an olive or lemon twist'
    ],
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
    description: 'A classic whiskey cocktail with a perfect balance of sweet and bitter.',
    instructions: [
      'Add simple syrup and bitters to a rocks glass',
      'Add a large ice cube',
      'Pour bourbon over ice',
      'Stir gently to combine',
      'Garnish with an orange peel'
    ],
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
    hasIce: true,
    description: 'A tangy tequila cocktail with lime and orange liqueur, served with a salted rim.',
    instructions: [
      'Rim a margarita glass with salt',
      'Fill a shaker with ice',
      'Add tequila, lime juice, and triple sec',
      'Shake vigorously for 15 seconds',
      'Strain into the salt-rimmed glass over fresh ice'
    ],
    ingredients: [
      { name: 'Tequila', amount: 50, color: '#F5DEB3' },
      { name: 'Lime Juice', amount: 25, color: '#9ACD32' },
      { name: 'Triple Sec', amount: 25, color: '#FFE4B5' },
    ],
  },
  {
    name: 'Manhattan',
    id: 'manhattan',
    glassType: 'cocktail',
    liquidColor: '#8B4513',
    garnish: 'cherry',
    hasIce: false,
    description: 'A sophisticated whiskey cocktail with sweet vermouth and bitters.',
    instructions: [
      'Fill a mixing glass with ice',
      'Add rye whiskey, sweet vermouth, and bitters',
      'Stir for 30 seconds',
      'Strain into a chilled cocktail glass',
      'Garnish with a maraschino cherry'
    ],
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
    hasIce: false,
    description: 'A tropical blended cocktail with rum, coconut, and pineapple.',
    instructions: [
      'Add ice to a blender',
      'Pour in white rum, coconut cream, and pineapple juice',
      'Blend until smooth and creamy',
      'Pour into a hurricane glass',
      'Garnish with a cherry and pineapple wedge'
    ],
    ingredients: [
      { name: 'White Rum', amount: 50, color: '#ffffff' },
      { name: 'Coconut Cream', amount: 30, color: '#FFFACD' },
      { name: 'Pineapple Juice', amount: 90, color: '#FFD700' },
    ],
  },
  {
    name: 'Zombie',
    id: 'zombie',
    glassType: 'zombie',
    liquidColor: '#FF6347',
    garnish: 'cherry',
    hasIce: true,
    description: 'A potent tiki cocktail with multiple rums and tropical fruit juices.',
    instructions: [
      'Fill a shaker with ice',
      'Add white rum, dark rum, apricot brandy, lime juice, and pineapple juice',
      'Shake vigorously for 20 seconds',
      'Strain into a zombie glass filled with crushed ice',
      'Garnish with a cherry and mint sprig'
    ],
    ingredients: [
      { name: 'White Rum', amount: 45, color: '#ffffff' },
      { name: 'Dark Rum', amount: 45, color: '#8B4513' },
      { name: 'Apricot Brandy', amount: 30, color: '#FF8C00' },
      { name: 'Lime Juice', amount: 20, color: '#9ACD32' },
      { name: 'Pineapple Juice', amount: 40, color: '#FFD700' },
    ],
  },
  {
    name: 'Irish Beer',
    id: 'irish-beer',
    glassType: 'pint',
    liquidColor: '#D2691E',
    garnish: 'none',
    hasIce: false,
    description: 'A classic Irish stout with a creamy head and rich flavor.',
    instructions: [
      'Tilt the pint glass at 45 degrees',
      'Pour stout slowly down the side of the glass',
      'Fill to about 3/4 full',
      'Let settle for 90 seconds',
      'Top off to fill the glass completely'
    ],
    ingredients: [
      { name: 'Stout Beer', amount: 473, color: '#2F1B14' },
    ],
  },
  {
    name: 'German Lager',
    id: 'german-lager',
    glassType: 'seidel',
    liquidColor: '#FFD700',
    garnish: 'none',
    hasIce: false,
    description: 'A crisp, refreshing German-style lager served in a traditional stein.',
    instructions: [
      'Ensure glass is clean and chilled',
      'Hold glass at 45-degree angle',
      'Pour lager slowly down the side',
      'Straighten glass as it fills',
      'Leave 1-2 inches of foam head'
    ],
    ingredients: [
      { name: 'Lager Beer', amount: 500, color: '#F4A460' },
    ],
  },
  {
    name: 'Tequila Shot',
    id: 'tequila-shot',
    glassType: 'shot',
    liquidColor: '#F5DEB3',
    garnish: 'lime',
    hasIce: false,
    description: 'A traditional tequila shot served with salt and lime.',
    instructions: [
      'Pour tequila into a shot glass',
      'Lick the back of your hand and sprinkle salt on it',
      'Lick the salt',
      'Drink the tequila shot',
      'Bite into a lime wedge'
    ],
    ingredients: [
      { name: 'Tequila', amount: 44, color: '#F5DEB3' },
    ],
  },
]
