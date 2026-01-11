import { create } from 'zustand';
import { api } from '@/services/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, otp: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

// Helper to safely access localStorage (SSR-safe)
const getStoredUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
};

const setStoredUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
        localStorage.setItem('admin_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('admin_user');
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, otp: string) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            if (data.user.role !== 'admin') {
                throw new Error('Admin access required');
            }
            // Store user in localStorage for persistence across page refreshes
            setStoredUser(data.user);
            set({ user: data.user, isAuthenticated: true });
            return true;
        } catch {
            return false;
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setStoredUser(null);
            set({ user: null, isAuthenticated: false });
        }
    },

    checkAuth: async () => {
        // First check localStorage for stored user
        const storedUser = getStoredUser();
        if (storedUser && storedUser.role === 'admin') {
            set({ user: storedUser, isAuthenticated: true, isLoading: false });
            return;
        }

        // Fallback to session check (works locally, may not work cross-domain)
        try {
            const { data } = await api.get('/auth/me');
            if (data.user.role === 'admin') {
                setStoredUser(data.user);
                set({ user: data.user, isAuthenticated: true, isLoading: false });
            } else {
                setStoredUser(null);
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            // If session check fails but we have stored user, keep them logged in
            if (storedUser) {
                set({ user: storedUser, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        }
    },
}));

