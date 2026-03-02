import {create} from 'zustand';
import type { User } from '@taskflow/shared';

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;

    setAuth: (token: string, user: User) => void;
    clearAuth: () => void;
}

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

function loadInitialState(): Pick<AuthState, 'token' | 'user' | 'isAuthenticated'> {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userRaw = localStorage.getItem(USER_KEY);
        if (token && userRaw) {
            return { token, user: JSON.parse(userRaw), isAuthenticated: true };
        }
    } catch {

    }
    return { token: null, user: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>()((set) => ({
    ...loadInitialState(),

    setAuth: (token, user) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        set({token, user, isAuthenticated: true});
    },

    clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        set({ token: null, user: null, isAuthenticated: false });
    },
}));

