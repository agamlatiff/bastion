import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { navigationItems } from './navigation';

export const Sidebar: React.FC = () => {
    return (
        <aside className="hidden md:flex flex-col w-60 bg-[#09090b] border-r border-zinc-800/80 p-4 shrink-0 select-none">
            {/* Brand Header */}
            <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white text-zinc-950 font-bold shadow-sm">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight text-white">Bastion</span>
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
