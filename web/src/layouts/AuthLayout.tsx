import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden bg-grid-subtle select-none">
            {/* Ambient Background Subtle Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-blue-600/[0.07] rounded-full blur-[160px] pointer-events-none" />

            {/* Centered Single-Column Focus Card */}
            <div className="w-full max-w-md rounded-3xl bg-[#111114] border border-zinc-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-6 sm:p-9 relative z-10">
                <Outlet />
            </div>

            {/* Back to Home Link */}
            <div className="mt-6 text-center text-xs text-zinc-500 relative z-10">
                <Link to="/" className="text-zinc-400 hover:text-white transition-colors">
                    &larr; Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
};
