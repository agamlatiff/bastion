import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ErrorStateProps {
    title?: string;
    message?: string;
    requestId?: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Failed to load data',
    message = 'An unexpected error occurred while communicating with Bastion services.',
    requestId,
    onRetry,
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-900/50 bg-rose-950/20 max-w-md mx-auto my-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-900/40 text-rose-400 mb-4 ring-1 ring-rose-700/50">
                <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1.5">{title}</h4>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">{message}</p>
            {requestId && (
                <p className="text-xs text-slate-500 font-mono mb-6 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                    Request ID: {requestId}
                </p>
            )}
            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                    Try Again
                </Button>
            )}
        </div>
    );
};
