import React from 'react';
import { Spinner } from '../ui/Spinner';

export interface LoadingStateProps {
    message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading financial data...' }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[300px]">
            <Spinner size="lg" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">{message}</p>
        </div>
    );
};
