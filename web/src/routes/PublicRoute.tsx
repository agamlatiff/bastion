import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export const PublicRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (!isLoading && isAuthenticated) {
        return <Navigate to="/app/dashboard" replace />;
    }

    return <Outlet />;
};
