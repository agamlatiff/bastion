import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loginApi, logoutApi, verify2FAApi } from './api';
import { AuthContext } from './authContext';
import type { User, LoginRequest, AuthResponse } from '../../types/auth';

function getInitialUser(): User | null {
    try {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            return JSON.parse(storedUser);
        }
    } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }
    return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(getInitialUser);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const login = useCallback(
        async (credentials: LoginRequest): Promise<AuthResponse> => {
            setIsLoading(true);
            try {
                const response = await loginApi(credentials);
                if (!response.two_factor_required && response.access_token && response.refresh_token && response.user) {
                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    setUser(response.user);
                }
                return response;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const verify2FA = useCallback(
        async (tempToken: string, code: string) => {
            setIsLoading(true);
            try {
                const response = await verify2FAApi({ temp_token: tempToken, code });
                if (response.access_token && response.refresh_token && response.user) {
                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    setUser(response.user);
                }
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        try {
            if (refreshToken) {
                await logoutApi(refreshToken);
            }
        } catch (e) {
            console.warn('Backend logout failed or token already invalid:', e);
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            setUser(null);
            queryClient.clear();
            navigate('/login', { replace: true });
        }
    }, [navigate, queryClient]);

    const value = {
        user,
        isAuthenticated: !!user && !!localStorage.getItem('access_token'),
        isLoading,
        login,
        verify2FA,
        logout,
        setUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
