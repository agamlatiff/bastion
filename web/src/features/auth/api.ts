import { api } from '../../lib/api';
import type { LoginRequest, RegisterRequest, AuthResponse, ApiResponse, User } from '../../types/auth';

export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
}

export async function registerApi(data: RegisterRequest): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
}

export async function refreshApi(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken,
    });
    return response.data;
}

export async function logoutApi(refreshToken: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/logout', {
        refresh_token: refreshToken,
    });
    return response.data;
}
