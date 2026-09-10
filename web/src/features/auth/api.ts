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

export async function verify2FAApi(data: { temp_token: string; code: string }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/2fa/verify', data);
    return response.data;
}

export async function setup2FAApi(): Promise<{ secret: string; qr_code_uri: string }> {
    const response = await api.post<{ secret: string; qr_code_uri: string }>('/auth/2fa/setup');
    return response.data;
}

export async function enable2FAApi(code: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/enable', { code });
    return response.data;
}

export async function disable2FAApi(code: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/disable', { code });
    return response.data;
}

