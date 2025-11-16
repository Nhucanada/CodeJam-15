export const authAPI = {
    signup: async (email: string, password: string, full_name: string) => {
        const response = await fetch('https://barline-30370655280.us-east4.run.app:8000/api/v1/auth/signup', {
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
        const response = await fetch('https://barline-30370655280.us-east4.run.app:8000/api/v1/auth/login', {
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

        const response = await fetch('https://barline-30370655280.us-east4.run.app:8000/api/v1/auth/refresh', {
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