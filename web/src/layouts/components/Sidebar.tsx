import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { BastionLogo } from '../../components/common/BastionLogo';
import { navigationItems, adminNavigationItems } from './navigation';
import { useAuth } from '../../features/auth/useAuth';

export const Sidebar: React.FC = () => {
    const { isAdmin } = useAuth();

    return (
        <aside className="hidden md:flex flex-col w-[70px] bg-[#09090b] border-r border-zinc-800/80 py-5 px-3 items-center shrink-0 select-none z-40">
            {/* Brand Header Icon Rail */}
            <NavLink
                to="/app/dashboard"
                className="group relative flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all mb-4"
                title="Bastion Financial OS"
            >
                <BastionLogo className="w-6 h-6 text-white shrink-0" />
                {/* Brand Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5">
                    <span className="font-bold font-heading">Bastion</span>
                    <span className="text-[10px] font-mono text-zinc-400">v1.0</span>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-800 rotate-45" />
                </div>
            </NavLink>

            <div className="h-px w-8 bg-zinc-800/80 mb-3" />

            {/* Main Navigation Links (Icon-Only with Tooltip) */}
            <nav className="flex-1 flex flex-col items-center space-y-2" aria-label="Main Navigation">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                clsx(
                                    'group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all cursor-pointer',
                                    isActive
                                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                                )
                            }
                        >
                            <Icon className="w-5 h-5 shrink-0" />

                            {/* Floating Right Tooltip */}
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5">
                                <span className="font-medium">{item.name}</span>
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-800 rotate-45" />
                            </div>
                        </NavLink>
                    );
                })}

                {/* Administrator Navigation Section */}
                {isAdmin && (
                    <>
                        <div className="h-px w-8 bg-zinc-800/80 my-2" />
                        {adminNavigationItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        clsx(
                                            'group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all cursor-pointer',
                                            isActive
                                                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-semibold'
                                                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 border border-transparent'
                                        )
                                    }
                                >
                                    <Icon className="w-5 h-5 shrink-0 text-amber-400/80" />

                                    {/* Admin Tooltip */}
                                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 border border-amber-800/50 text-amber-200 text-xs rounded-md whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5">
                                        <span className="font-medium">{item.name}</span>
                                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-l border-b border-amber-800/50 rotate-45" />
                                    </div>
                                </NavLink>
                            );
                        })}
                    </>
                )}
            </nav>

            {/* Service Gateway Health Indicator (Compact Dot with Tooltip) */}
            <div className="group relative mt-auto flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/80 cursor-default">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />

                {/* Status Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs rounded-md whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 text-left">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Layanan Terhubung
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">Sistem Finansial Aktif & Sah</div>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-l border-b border-zinc-800 rotate-45" />
                </div>
            </div>
        </aside>
    );
};
