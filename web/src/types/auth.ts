// Standard API Envelope returned by Bastion Backend
export interface ApiResponse<T = unknown> {
    status?: 'success' | 'error';
    message?: string;
    data?: T;
    error?: string;
}

// User Entity matching Identity Service domain.UserResponse
export interface User {
    id: string;
    email: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'CLOSED' | string;
    two_factor_enabled?: boolean;
    roles?: string[];
    created_at: string;
}

// Payload for POST /v1/auth/login
export interface LoginRequest {
    email: string;
    password: string;
    device_id?: string;
}

// Payload for POST /v1/auth/register
export interface RegisterRequest {
    email: string;
    password: string;
}

// Unified Auth response returned by login and refresh
export interface AuthResponse {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    user?: User;
    two_factor_required?: boolean;
    temp_token?: string;
}

// 2FA Payloads
export interface TwoFactorSetupResponse {
    secret: string;
    qr_code_uri: string;
}

export interface TwoFactorEnableRequest {
    code: string;
}

export interface TwoFactorVerifyRequest {
    temp_token: string;
    code: string;
}

// Alias for RefreshTokenResponse
export type RefreshTokenResponse = AuthResponse;

