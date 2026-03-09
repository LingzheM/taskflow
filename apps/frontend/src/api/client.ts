import axios from 'axios';
import type { ApiResponse } from '@taskflow/shared';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401, clear auth and redirect to login
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('taskflow_token');
            localStorage.removeItem('taskflow_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

// Type helper - unwraps ApiResponse<T>
export async function apiFetch<T> (
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: unknown,
): Promise<T> {
    const res = await apiClient.request<ApiResponse<T>>({ method, url, data });
    if (!res.data.success || res.data.data === undefined) {
        throw new Error(res.data.error?.message || 'API error');
    }
    return res.data.data;
}