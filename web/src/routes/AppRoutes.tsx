import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WalletsPage } from '../pages/WalletsPage';
import { WalletDetailPage } from '../pages/WalletDetailPage';
import { ActivityPage } from '../pages/ActivityPage';
import { ProfilePage } from '../pages/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LandingPage } from '../pages/LandingPage';

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Unauthenticated Routes */}
            <Route element={<PublicRoute />}>
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>
            </Route>

            {/* Protected Authenticated App Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="/app/dashboard" element={<DashboardPage />} />
                    <Route path="/app/wallets" element={<WalletsPage />} />
                    <Route path="/app/wallets/:walletId" element={<WalletDetailPage />} />
                    <Route path="/app/activity" element={<ActivityPage />} />
                    <Route path="/app/profile" element={<ProfilePage />} />
                </Route>
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};
