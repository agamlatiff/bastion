import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { BastionLogo } from '../../components/common/BastionLogo';
import { navigationItems, adminNavigationItems } from './navigation';
import { useAuth } from '../../features/auth/useAuth';

export const Sidebar: React.FC = () => {
    const { isAdmin } = useAuth();
    return (
        <aside className="hidden md:flex flex-col w-60 bg-[#09090b] border-r border-zinc-800/80 p-4 shrink-0 select-none">
            {/* Brand Header */}
            <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
                <BastionLogo className="w-6 h-6 text-white shrink-0" />
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-white font-heading">Bastion</span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1 py-0.2 rounded border border-zinc-800 bg-zinc-900">
                        v1.0
                    </span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1" aria-label="Main Navigation">
                <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Menu Utama
                </div>
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-2.5 py-2 text-xs font-medium rounded-md transition-colors',
                                    isActive
                                        ? 'bg-zinc-900 text-white border border-zinc-800 shadow-xs font-semibold'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                                )
                            }
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.name}</span>
                        </NavLink>
                    );
                })}

                {/* Administrator Section */}
                {isAdmin && (
                    <div className="pt-4 mt-3 border-t border-zinc-800/60 space-y-1">
                        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            <span>Administrasi</span>
                        </div>
                        {adminNavigationItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        clsx(
                                            'flex items-center gap-3 px-2.5 py-2 text-xs font-medium rounded-md transition-colors',
                                            isActive
                                                ? 'bg-amber-950/30 text-amber-300 border border-amber-800/50 shadow-xs font-semibold'
                                                : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-900/50'
                                        )
                                    }
                                >
                                    <Icon className="w-4 h-4 shrink-0 text-amber-400/80" />
                                    <span>{item.name}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* Service Gateway Health Indicator */}
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-xs space-y-1 mt-auto">
                <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>Layanan Terhubung</span>
                </div>
                <p className="text-[10px] text-zinc-500">
                    Sistem Perbankan Aktif & Aman
                </p>
            </div>
        </aside>
    );
};
