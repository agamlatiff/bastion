import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { LoadingState } from '../components/common/LoadingState';

export interface RoleRouteProps {
    allowedRoles: string[];
    fallbackPath?: string;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, fallbackPath = '/app/dashboard' }) => {
    const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <LoadingState message="Memverifikasi izin otorisasi peran..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!hasAnyRole(allowedRoles)) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <Outlet />;
};
