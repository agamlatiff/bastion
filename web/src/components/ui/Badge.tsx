import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'neutral';
    showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    className,
    variant = 'default',
    showDot = true,
    ...props
}) => {
    const variantStyles = {
        default: {
            container: 'bg-zinc-900 text-zinc-300 border-zinc-800',
            dot: 'bg-zinc-400',
        },
        neutral: {
            container: 'bg-zinc-900 text-zinc-400 border-zinc-800',
            dot: 'bg-zinc-500',
        },
        cyan: {
            container: 'bg-sky-950/40 text-sky-300 border-sky-800/60',
            dot: 'bg-sky-400',
        },
        info: {
            container: 'bg-zinc-900 text-zinc-300 border-zinc-700',
            dot: 'bg-zinc-400',
        },
        success: {
            container: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
            dot: 'bg-emerald-400',
        },
        warning: {
            container: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
            dot: 'bg-amber-400',
        },
        danger: {
            container: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
            dot: 'bg-rose-400',
        },
    };

    const current = variantStyles[variant] || variantStyles.default;

    return (
        <div
            className={twMerge(
                clsx(
                    'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono font-medium tracking-tight select-none',
                    current.container,
                    className
                )
            )}
            {...props}
        >
            {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />}
            <span>{children}</span>
        </div>
    );
};
