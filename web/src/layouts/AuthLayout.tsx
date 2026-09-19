import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center py-8 px-3.5 sm:px-6 relative overflow-hidden bg-grid-subtle select-none">
            {/* Ambient Background Subtle Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[500px] bg-blue-600/[0.08] rounded-full blur-[120px] sm:blur-[160px] pointer-events-none" />

            {/* Centered Floating Card (Maintains laptop card aesthetic on mobile & tablet) */}
            <div className="w-full max-w-[420px] sm:max-w-md rounded-2xl sm:rounded-3xl bg-[#111114] border border-zinc-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-5 sm:p-8 md:p-9 relative z-10">
                <Outlet />
            </div>

            {/* Back to Home Link */}
            <div className="mt-5 sm:mt-6 text-center text-xs text-zinc-500 relative z-10">
                <Link to="/" className="text-zinc-400 hover:text-white transition-colors">
                    &larr; Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
};

