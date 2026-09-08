import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-950/40 text-rose-400 border border-rose-800/40 mb-6 shadow-2xl">
                <ShieldAlert className="w-8 h-8" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">404</h1>
            <h2 className="text-xl font-bold text-slate-200 mb-3">Page Not Found</h2>
            <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
                The financial resource or endpoint you requested does not exist on Bastion Portal.
            </p>

            <Link to="/app/dashboard">
                <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Return to Dashboard
                </Button>
            </Link>
        </div>
    );
};
