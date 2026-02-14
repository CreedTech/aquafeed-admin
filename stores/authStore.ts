import { create } from 'zustand';

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
    login: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, otp: string) => {
        try {
            // Use local proxy route instead of direct backend call
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error);
            if (data.user.role !== 'admin') {
                throw new Error('Admin access required');
            }
            set({ user: data.user, isAuthenticated: true, isLoading: false });
            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to login';
            set({ user: null, isAuthenticated: false, isLoading: false });
            return { success: false, error: message };
        }
    },

    logout: async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            set({ user: null, isAuthenticated: false });
        }
    },

    checkAuth: async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();

            if (response.ok && data.user?.role === 'admin') {
                set({ user: data.user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
