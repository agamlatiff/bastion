import { createContext, useContext } from 'react';
import type { User, LoginRequest, AuthResponse } from '../../types/auth';

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginRequest) => Promise<AuthResponse>;
    verify2FA: (tempToken: string, code: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    isAdmin: boolean;
    isCustomer: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
