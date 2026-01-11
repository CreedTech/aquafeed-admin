import axios from 'axios';

// Use local proxy to forward requests to backend with session cookie
// This ensures cross-domain auth works correctly
const API_URL = '/api/proxy';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Don't auto-redirect on 401 - let components handle auth state
