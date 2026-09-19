import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, Zap, Lock, Coins } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';

export const Navbar: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    // Close mobile menu when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div ref={navRef} className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl">
            {/* Main Floating Pill Bar */}
            <header className="w-full bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/90 rounded-full shadow-2xl shadow-black/80 px-5 sm:px-7 h-16 sm:h-17 flex items-center justify-between transition-all">
                {/* Brand Logo - Just Bastion */}
                <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_14px_rgba(37,99,235,0.25)] group-hover:border-blue-400 group-hover:bg-blue-600/30 transition-all shrink-0">
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="font-bold text-white tracking-tight text-lg sm:text-xl">
                        Bastion
                    </span>
                </Link>

                {/* Desktop Navigation Links (Necessary items only) */}
                <nav className="hidden md:flex items-center gap-1.5 text-sm sm:text-[15px] font-medium text-zinc-300">
                    <a
                        href="#solusi"
                        className="px-4 py-2 rounded-full hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                        Solusi
                    </a>
                    <a
                        href="#keunggulan"
                        className="px-4 py-2 rounded-full hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                        Keunggulan
                    </a>
                    <a
                        href="#keamanan"
                        className="px-4 py-2 rounded-full hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                        Keamanan
                    </a>
                    <a
                        href="#demo"
                        className="px-4 py-2 rounded-full hover:text-white hover:bg-zinc-800/60 transition-colors"
                    >
                        Coba Simulasi
                    </a>
                </nav>

                {/* Desktop Auth Actions */}
                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated ? (
                        <Link
                            to="/app/dashboard"
                            className="bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-[15px] font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-blue-600/30 transition-all"
                        >
                            Dasbor
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-sm sm:text-[15px] font-medium text-zinc-300 hover:text-white px-3 py-2 transition-colors"
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/register"
                                className="bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-[15px] font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center gap-2"
                            >
                                <span>Mulai Gratis</span>
                                <Zap className="w-4 h-4 fill-current" />
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Hamburger & Quick Action (< md) */}
                <div className="flex md:hidden items-center gap-2">
                    <Link
                        to={isAuthenticated ? '/app/dashboard' : '/register'}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-full shadow-sm"
                    >
                        {isAuthenticated ? 'Dasbor' : 'Mulai'}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                        aria-label="Toggle Navigation Menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Mobile Navigation Drawer Dropdown (< md) */}
            {mobileMenuOpen && (
                <div className="md:hidden mt-2.5 w-full bg-zinc-950/95 backdrop-blur-2xl rounded-3xl border border-zinc-800/90 shadow-2xl shadow-black/90 p-5 overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-150 text-zinc-100 space-y-4">
                    <div className="space-y-1">
                        <a
                            href="#solusi"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                            <Zap className="w-4 h-4 text-zinc-400" />
                            <span>Solusi</span>
                        </a>

                        <a
                            href="#keunggulan"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                            <ShieldCheck className="w-4 h-4 text-zinc-400" />
                            <span>Keunggulan</span>
                        </a>

                        <a
                            href="#keamanan"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                            <Lock className="w-4 h-4 text-zinc-400" />
                            <span>Keamanan</span>
                        </a>

                        <a
                            href="#demo"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                            <Coins className="w-4 h-4 text-zinc-400" />
                            <span>Coba Simulasi</span>
                        </a>
                    </div>

                    {/* Mobile Auth Buttons */}
                    <div className="pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
                        {isAuthenticated ? (
                            <Link
                                to="/app/dashboard"
                                onClick={closeMobileMenu}
                                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
                            >
                                Buka Dasbor Saya
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    onClick={closeMobileMenu}
                                    className="w-full py-2.5 text-center bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-medium rounded-xl border border-zinc-800 transition-colors"
                                >
                                    Masuk ke Akun
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={closeMobileMenu}
                                    className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-colors"
                                >
                                    Daftar Gratis
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
