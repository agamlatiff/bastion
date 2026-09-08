import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MobileNav } from './components/MobileNav';
import { CommandPalette } from '../components/common/CommandPalette';

export const AppLayout: React.FC = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    // Global keyboard listener for Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Drawer & Bottom Navigation */}
            <MobileNav
                isOpen={isMobileNavOpen}
                onClose={() => setIsMobileNavOpen(false)}
            />

            {/* Main Application Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar
                    onOpenMobileNav={() => setIsMobileNavOpen(true)}
                    onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-8">
                    <Outlet />
                </main>
            </div>

            {/* Global Command Palette */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />
        </div>
    );
};
