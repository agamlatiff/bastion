import React from 'react';
import { Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <div
            className={twMerge(
                clsx(
                    'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-zinc-800 bg-[#0d0d10]',
                    className
                )
            )}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
                {icon || <Inbox className="w-5 h-5" />}
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 mb-1">{title}</h4>
            {description && (
                <p className="text-xs text-zinc-500 max-w-sm mb-4 leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
};
