import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Zap, Lock, Coins } from 'lucide-react';
import { BastionLogo } from '../common/BastionLogo';
import { useAuth } from '../../features/auth/useAuth';

export const Navbar: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    // Scroll listener for dynamic frosted pill morphing
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        <div
            ref={navRef}
            className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
                isScrolled
                    ? 'top-2.5 sm:top-3.5 w-[92%] max-w-4xl'
                    : 'top-3.5 sm:top-5 w-[94%] max-w-5xl'
            }`}
        >
            {/* Main Floating Pill Bar */}
            <header
                className={`w-full rounded-full flex items-center justify-between transition-all duration-300 ease-out ${
                    isScrolled
                        ? 'bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.85)] ring-1 ring-white/5 px-4 sm:px-6 h-13 sm:h-14'
                        : 'bg-zinc-950/65 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/60 px-5 sm:px-7 h-16 sm:h-17'
                }`}
            >
                {/* Brand Logo - Bastion */}
                <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 sm:gap-3 group">
                    <div
                        className={`rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_14px_rgba(37,99,235,0.25)] group-hover:border-blue-400 group-hover:bg-blue-600/30 transition-all duration-300 shrink-0 ${
                            isScrolled ? 'w-8 h-8 sm:w-8.5 sm:h-8.5' : 'w-9 h-9 sm:w-10 sm:h-10'
                        }`}
                    >
                        <BastionLogo className={`transition-all duration-300 ${isScrolled ? 'w-4 h-4 sm:w-4.5 sm:h-4.5' : 'w-5 h-5'}`} />
                    </div>
                    <span className={`font-bold text-white tracking-tight transition-all duration-300 ${
                        isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                    }`}>
                        Bastion
                    </span>
                </Link>

                {/* Desktop Navigation Links (Synced to landing page sections) */}
                <nav className={`hidden md:flex items-center gap-1 font-medium text-zinc-300 transition-all duration-300 ${
                    isScrolled ? 'text-xs sm:text-[13.5px]' : 'text-sm sm:text-[15px]'
                }`}>
                    <a
                        href="#demo"
                        className={`rounded-full hover:text-white hover:bg-zinc-800/60 transition-all ${
                            isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
                        }`}
                    >
                        Dasbor
                    </a>
                    <a
                        href="#keunggulan"
                        className={`rounded-full hover:text-white hover:bg-zinc-800/60 transition-all ${
                            isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
                        }`}
                    >
                        Keunggulan
                    </a>
                    <a
                        href="#keamanan"
                        className={`rounded-full hover:text-white hover:bg-zinc-800/60 transition-all ${
                            isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
                        }`}
                    >
                        Keamanan
                    </a>
                </nav>

                {/* Desktop Auth Actions */}
                <div className="hidden md:flex items-center gap-2.5">
                    {isAuthenticated ? (
                        <Link
                            to="/app/dashboard"
                            className={`bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-600/30 transition-all ${
                                isScrolled ? 'text-xs sm:text-sm px-4 py-2' : 'text-sm sm:text-[15px] px-5 py-2.5'
                            }`}
                        >
                            Dasbor
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className={`font-medium text-zinc-300 hover:text-white transition-colors ${
                                    isScrolled ? 'text-xs sm:text-sm px-2.5 py-1.5' : 'text-sm sm:text-[15px] px-3 py-2'
                                }`}
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/register"
                                className={`bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center gap-2 ${
                                    isScrolled ? 'text-xs sm:text-sm px-4 py-2' : 'text-sm sm:text-[15px] px-5 py-2.5'
                                }`}
                            >
                                <span>Mulai Gratis</span>
                                <Zap className={`fill-current ${isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
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
                            href="#demo"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                            <Zap className="w-4 h-4 text-zinc-400" />
                            <span>Dasbor Interaktif</span>
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
