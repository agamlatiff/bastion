import React from 'react';
import { NavLink } from 'react-router-dom';
import { navigationItems } from './navigation';
import { clsx } from 'clsx';
import { X, ShieldCheck } from 'lucide-react';

export interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
    return (
        <>
            {/* Mobile Drawer Backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden animate-in fade-in"
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 w-72 bg-[#09090b] border-r border-zinc-800 p-6 flex flex-col transition-transform duration-300 ease-in-out md:hidden',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white text-zinc-950 font-bold shadow-sm">
                            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="font-bold text-base text-white tracking-tight">Bastion</span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close navigation menu"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 py-6 space-y-1" aria-label="Mobile Navigation">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3.5 px-3.5 py-3 text-sm font-medium rounded-xl transition-all',
                                        isActive
                                            ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                                    )
                                }
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Mobile Bottom Navigation Bar (Persistent at bottom) */}
            <div className="fixed bottom-0 inset-x-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800 flex items-center justify-around py-2 px-1 md:hidden">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                clsx(
                                    'flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-medium rounded-lg transition-colors',
                                    isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                                )
                            }
                        >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </NavLink>
                    );
                })}
            </div>
        </>
    );
};
