// API Configuration
export const API_BASE_URL = import.meta.env.VITE_ARTHUR_URL || 'http://localhost:8080';

// WebSocket URL (convert http/https to ws/wss)
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

