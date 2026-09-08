import React from 'react';
import { LogOut, ShieldCheck, User as UserIcon, Search } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useCustomerProfile } from '../../features/customer/hooks';
import { Button } from '../../components/ui/Button';
import { NotificationCenter } from '../../components/common/NotificationCenter';

export interface TopbarProps {
    onOpenMobileNav?: () => void;
    onOpenCommandPalette?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileNav, onOpenCommandPalette }) => {
    const { user, logout } = useAuth();
    const { data: profile } = useCustomerProfile();

    const displayName = profile?.fullName || profile?.full_name || user?.email || 'User';

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
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span className="font-bold tracking-tight text-white text-sm">Bastion</span>
                </div>
            </div>

            {/* Desktop breadcrumb / Search Bar */}
            <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                    <span>bastion</span>
                    <span>/</span>
                    <span className="text-zinc-300">dasbor</span>
                </div>

                {/* Command Palette Trigger Button */}
                <button
                    onClick={onOpenCommandPalette}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Cari perintah (Ctrl + K)"
                >
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Cari menu atau perintah...</span>
                    <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                        Ctrl K
                    </kbd>
                </button>
            </div>

            {/* Right User menu & Notification Center */}
            <div className="flex items-center gap-2.5">
                {/* Notification Center */}
                <NotificationCenter />

                {/* Profile Chip */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-medium text-zinc-200 text-xs truncate max-w-[120px] sm:max-w-[160px]">
                        {displayName}
                    </span>
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
