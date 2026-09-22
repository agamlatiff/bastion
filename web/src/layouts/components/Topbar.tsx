import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, User as UserIcon, Search, ChevronRight } from 'lucide-react';
import { BastionLogo } from '../../components/common/BastionLogo';
import { useAuth } from '../../features/auth/useAuth';
import { useCustomerProfile } from '../../features/customer/hooks';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { NotificationCenter } from '../../components/common/NotificationCenter';

export interface TopbarProps {
    onOpenMobileNav?: () => void;
    onOpenCommandPalette?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileNav, onOpenCommandPalette }) => {
    const { user, logout, isAdmin } = useAuth();
    const { data: profile } = useCustomerProfile();
    const location = useLocation();

    const displayName = profile?.fullName || profile?.full_name || user?.email || 'User';
    const primaryRole = isAdmin ? 'ADMIN' : (user?.roles?.[0] || 'CUSTOMER');

    // Dynamic Breadcrumbs Path Mapping
    const getBreadcrumbs = (pathname: string) => {
        if (pathname.startsWith('/app/wallets/') && pathname !== '/app/wallets') {
            return [
                { label: 'Aplikasi', href: '/app/dashboard' },
                { label: 'Dompet & Rekening', href: '/app/wallets' },
                { label: 'Rincian Rekening', href: undefined },
            ];
        }
        switch (pathname) {
            case '/app/dashboard':
                return [
                    { label: 'Aplikasi', href: '/app/dashboard' },
                    { label: 'Dasbor Finansial', href: undefined },
                ];
            case '/app/wallets':
                return [
                    { label: 'Aplikasi', href: '/app/dashboard' },
                    { label: 'Dompet & Rekening', href: undefined },
                ];
            case '/app/activity':
                return [
                    { label: 'Aplikasi', href: '/app/dashboard' },
                    { label: 'Riwayat Mutasi', href: undefined },
                ];
            case '/app/profile':
                return [
                    { label: 'Aplikasi', href: '/app/dashboard' },
                    { label: 'Profil Pengguna', href: undefined },
                ];
            case '/app/admin/users':
                return [
                    { label: 'Administrasi', href: '/app/admin/users' },
                    { label: 'Manajemen Pengguna', href: undefined },
                ];
            default:
                return [
                    { label: 'Aplikasi', href: '/app/dashboard' },
                    { label: 'Dasbor', href: undefined },
                ];
        }
    };

    const breadcrumbs = getBreadcrumbs(location.pathname);

    return (
        <header className="h-14 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
            {/* Mobile Brand */}
            <div className="flex items-center gap-3 md:hidden">
                <button
                    onClick={onOpenMobileNav}
                    aria-label="Open navigation menu"
                    className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <BastionLogo className="w-6 h-6 text-white shrink-0" />
                    <span className="font-bold tracking-tight text-white text-sm font-heading">Bastion</span>
                </div>
            </div>

            {/* Desktop Dynamic Breadcrumbs & Search Bar */}
            <div className="hidden md:flex items-center gap-4">
                {/* Dynamic Breadcrumbs */}
                <nav aria-label="Breadcrumb Navigation" className="flex items-center gap-1.5 text-xs select-none">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.label}>
                            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                            {crumb.href ? (
                                <Link
                                    to={crumb.href}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors font-medium font-sans"
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-zinc-200 font-semibold font-sans">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="h-4 w-px bg-zinc-800/80" />

                {/* Command Palette Trigger Button */}
                <button
                    onClick={onOpenCommandPalette}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Cari perintah (Ctrl + K)"
                >
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Cari menu...</span>
                    <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                        Ctrl K
                    </kbd>
                </button>
            </div>

            {/* Right User menu & Notification Center */}
            <div className="flex items-center gap-2.5">
                {/* Notification Center */}
                <NotificationCenter />

                {/* Profile Chip & Role Badge */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-medium text-zinc-200 text-xs truncate max-w-[120px] sm:max-w-[160px]">
                        {displayName}
                    </span>
                    <Badge
                        variant={primaryRole === 'ADMIN' ? 'warning' : 'cyan'}
                        showDot={primaryRole === 'ADMIN'}
                        className="hidden sm:inline-flex py-0 px-1.5 text-[9px]"
                    >
                        {primaryRole}
                    </Badge>
                </div>

                {/* Logout Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                    className="text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20"
                >
                    <span className="hidden sm:inline">Keluar</span>
                </Button>
            </div>
        </header>
    );
};
