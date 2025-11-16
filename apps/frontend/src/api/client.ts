export const cocktailAPI = {
getUserShelf: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/v1/cocktails/shelf', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
    });
    return response.json();
},

getCocktailDetail: async (id: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/v1/cocktails/${id}`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
    });
    return response.json();
},

getCocktailIngredients: async (id: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/v1/cocktails/${id}/ingredients`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
    });
    return response.json();
}
};