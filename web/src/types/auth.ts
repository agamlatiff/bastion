// Standard API Envelope returned by Bastion Backend
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
    error?: string;
}

// User Entity matching GET /api/v1/auth/profile
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'USER' | 'ADMIN';
    tier: 'tier_1' | 'tier_2';
    is_verified: boolean;
    has_pin?: boolean;
    is_two_factor_enabled?: boolean;
    created_at: string;
}


// Payload for POST /api/v1/auth/login
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token?: string;
    refresh_token?: string;
    two_factor_required?: boolean;
    temp_token?: string;
    user?: User;
}

// Payload for POST /api/v1/auth/register
export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
}

// Payload for POST /api/v1/auth/2fa/verify
export interface TwoFactorVerifyRequest {
    temp_token: string;
    code: string;
}

// Response from POST /api/v1/auth/refresh
export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}
