import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#09090b] text-zinc-100 relative bg-grid-subtle">
            {/* Header Brand */}
            <div className="flex flex-col items-center mb-6 text-center">
                <Link to="/" className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-zinc-950 font-bold shadow-sm">
                        <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">Bastion</span>
                </Link>
                <p className="text-xs text-zinc-400 font-medium">
                    Dompet Digital & Pembukuan Bisnis
                </p>
            </div>

            {/* Auth Form Card Container */}
            <div className="w-full max-w-sm">
                <Outlet />
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-zinc-500">
                Aman &middot; Terenkripsi &middot; &copy; {new Date().getFullYear()} Bastion
            </footer>
        </div>
    );
};
