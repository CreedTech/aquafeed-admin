import axios from 'axios';

// Backend runs on port 5000
const API_URL = 'http://localhost:5001/api/v1';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Don't auto-redirect on 401 - let components handle auth state
