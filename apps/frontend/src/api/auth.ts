import { apiFetch } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@taskflow/shared";

export const authApi = {
    register: (data: RegisterRequest) =>
        apiFetch<AuthResponse>('post', '/api/auth/register', data),

    login: (data: LoginRequest) =>
        apiFetch<AuthResponse>('post', '/api/auth/login', data),
    
    me: () =>
        apiFetch<AuthResponse['user']>('get', '/api/auth/me'),
};