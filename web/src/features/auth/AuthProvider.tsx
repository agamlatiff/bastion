import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loginApi, logoutApi, verify2FAApi } from './api';
import { AuthContext } from './authContext';
import type { User, LoginRequest, AuthResponse } from '../../types/auth';

function extractRolesFromToken(token: string | null): string[] {
    if (!token) return [];
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (Array.isArray(payload.roles)) return payload.roles;
            if (payload.role) return [payload.role];
        }
    } catch {
        // ignore decode failure
    }
    return [];
}

function getInitialUser(): User | null {
    try {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            const parsed = JSON.parse(storedUser) as User & { role?: string };
            const tokenRoles = extractRolesFromToken(token);
            const userRoles = parsed.roles || (parsed.role ? [parsed.role] : []);
            const mergedRoles = Array.from(new Set([...userRoles, ...tokenRoles]));
            return {
                ...parsed,
                roles: mergedRoles.length > 0 ? mergedRoles : ['CUSTOMER'],
            };
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
                    const tokenRoles = extractRolesFromToken(response.access_token);
                    const roles = Array.from(new Set([...(response.user.roles || []), ...tokenRoles]));
                    const normalizedUser: User = {
                        ...response.user,
                        roles: roles.length > 0 ? roles : ['CUSTOMER'],
                    };

                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(normalizedUser));
                    setUser(normalizedUser);
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
                    const tokenRoles = extractRolesFromToken(response.access_token);
                    const roles = Array.from(new Set([...(response.user.roles || []), ...tokenRoles]));
                    const normalizedUser: User = {
                        ...response.user,
                        roles: roles.length > 0 ? roles : ['CUSTOMER'],
                    };

                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(normalizedUser));
                    setUser(normalizedUser);
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

    const userRoles = user?.roles || [];

    const hasRole = useCallback((role: string): boolean => {
        return userRoles.includes(role);
    }, [userRoles]);

    const hasAnyRole = useCallback((roles: string[]): boolean => {
        return roles.some((r) => userRoles.includes(r));
    }, [userRoles]);

    const isAdmin = userRoles.includes('ADMIN');
    const isCustomer = userRoles.includes('CUSTOMER');

    const value = {
        user,
        isAuthenticated: !!user && !!localStorage.getItem('access_token'),
        isLoading,
        login,
        verify2FA,
        logout,
        setUser,
        hasRole,
        hasAnyRole,
        isAdmin,
        isCustomer,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
