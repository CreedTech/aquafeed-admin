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
            set({ user: null, isAuthenticated: false });
        }
    },

    checkAuth: async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.user.role === 'admin') {
                set({ user: data.user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
