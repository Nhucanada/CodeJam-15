export const authAPI = {
    signup: async (email: string, password: string, full_name: string) => {
        const response = await fetch('https://barline-30370655280.us-east4.run.app:8080/api/v1/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                full_name
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
        }

        return response.json();
    },

    login: async (email: string, password: string) => {
        const response = await fetch('https://barline-30370655280.us-east4.run.app:8080/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
        }

        const data = await response.json();

        // Store tokens in localStorage
        if (data.tokens) {
            localStorage.setItem('access_token', data.tokens.access_token);
            localStorage.setItem('refresh_token', data.tokens.refresh_token);
        }

        return data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    refreshToken: async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch('https://barline-30370655280.us-east4.run.app:8080/api/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Refresh token failed:', errorData);
            // Refresh token is invalid, need to re-authenticate
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            throw new Error(errorData.detail || 'Refresh token expired');
        }

        const data = await response.json();
        console.log('Token refresh successful:', data);

        // Update tokens in localStorage
        if (data.tokens) {
            localStorage.setItem('access_token', data.tokens.access_token);
            localStorage.setItem('refresh_token', data.tokens.refresh_token);
        }

        return data;
    }
};

// In-memory storage for saved cocktails
const savedCocktails: any[] = [];

// Helper to calculate liquid color from ingredients
function calculateLiquidColor(ingredients: any[]): string {
    if (!ingredients || ingredients.length === 0) return '#CC2739';

    // Use the first ingredient's color if available
    const firstColoredIngredient = ingredients.find(ing => ing.color);
    return firstColoredIngredient?.color || '#CC2739';
}

export const cocktailAPI = {
getUserShelf: async () => {
    // Return saved cocktails from memory with visual data
    const cocktails = savedCocktails.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        ingredients_summary: recipe.ingredients.map((ing: any) => ing.name).join(', '),
        created_at: recipe.created_at || new Date().toISOString(),
        // Add visual data for shelf display
        glassType: recipe.glass_type || 'cocktail',
        liquidColor: recipe.liquidColor || calculateLiquidColor(recipe.ingredients)
    }));

    const greeting = cocktails.length === 0
        ? 'Welcome! Ready to create your first cocktail?'
        : cocktails.length === 1
        ? 'Welcome back! You have one cocktail in your collection.'
        : `Welcome back! You have ${cocktails.length} cocktails in your collection.`;

    return {
        cocktails,
        agent_greeting: greeting,
        total_count: cocktails.length
    };
},

getCocktailDetail: async (id: string) => {
    // Find cocktail in memory by ID
    const recipe = savedCocktails.find(c => c.id === id);
    if (!recipe) {
        throw new Error('Cocktail not found');
    }

    return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        type: recipe.glass_type,
        has_ice: recipe.has_ice ?? true,
        created_at: recipe.created_at || new Date().toISOString(),
        ingredients: recipe.ingredients.map((ing: any) => ({
            id: `ingredient-${Math.random()}`,
            name: ing.name,
            quantity: ing.amount,
            unit: ing.unit || 'ml',
            hexcode: ing.color
        })),
        garnishes: [],
        glass: null,
        recipe: recipe // Include full recipe for 3D rendering
    };
},

getCocktailIngredients: async (id: string) => {
    // Find cocktail in memory and return ingredients
    const recipe = savedCocktails.find(c => c.id === id);
    if (!recipe) {
        return [];
    }

    return recipe.ingredients.map((ing: any) => ({
        id: `ingredient-${Math.random()}`,
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit || 'ml',
        hexcode: ing.color
    }));
},

saveDrinkToShelf: async (recipe: any) => {
    console.log('[COCKTAIL API] Saving drink to in-memory shelf:', recipe);
    console.log('[COCKTAIL API] Recipe ingredients:', recipe.ingredients);
    console.log('[COCKTAIL API] Recipe glass_type:', recipe.glass_type);

    // Calculate liquid color from ingredients
    const liquidColor = calculateLiquidColor(recipe.ingredients);

    // Add ID, timestamp, and visual data if not present
    const cocktailToSave = {
        ...recipe,
        id: recipe.id || `cocktail-${Date.now()}-${Math.random()}`,
        created_at: new Date().toISOString(),
        liquidColor: liquidColor
    };

    // Save to in-memory array
    savedCocktails.push(cocktailToSave);

    console.log('[COCKTAIL API] Total saved cocktails:', savedCocktails.length);
    console.log('[COCKTAIL API] Saved cocktail:', cocktailToSave);
    console.log('[COCKTAIL API] Glass type:', cocktailToSave.glass_type, 'Liquid color:', liquidColor);

    return {
        success: true,
        message: 'Cocktail saved successfully',
        cocktail: cocktailToSave
    };
},

checkDrinkExists: async (name: string): Promise<boolean> => {
    // Check if drink exists in memory
    const exists = savedCocktails.some((cocktail: any) =>
        cocktail.name.toLowerCase() === name.toLowerCase()
    );
    console.log('[COCKTAIL API] Checking if drink exists:', name, '→', exists);
    return exists;
}
};