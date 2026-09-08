import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
}

export const Alert: React.FC<AlertProps> = ({
    children,
    className,
    variant = 'info',
    title,
    ...props
}) => {
    const config = {
        info: {
            icon: Info,
            container: 'bg-zinc-900/80 border-zinc-800 text-zinc-300',
            iconColor: 'text-zinc-400',
        },
        success: {
            icon: CheckCircle2,
            container: 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300',
            iconColor: 'text-emerald-400',
        },
        warning: {
            icon: AlertTriangle,
            container: 'bg-amber-950/20 border-amber-900/40 text-amber-300',
            iconColor: 'text-amber-400',
        },
        error: {
            icon: AlertCircle,
            container: 'bg-rose-950/20 border-rose-900/40 text-rose-300',
            iconColor: 'text-rose-400',
        },
    };

    const current = config[variant];
    const IconComponent = current.icon;

    return (
        <div
            role="alert"
            className={twMerge(
                clsx(
                    'relative w-full rounded-md border p-3.5 text-xs flex gap-3 text-left',
                    current.container,
                    className
                )
            )}
            {...props}
        >
            <IconComponent className={clsx('w-4 h-4 shrink-0 mt-0.5', current.iconColor)} />
            <div className="space-y-0.5 flex-1">
                {title && <h5 className="font-semibold leading-tight text-zinc-200">{title}</h5>}
                <div className="text-xs text-zinc-400 leading-relaxed">{children}</div>
            </div>
        </div>
    );
};
