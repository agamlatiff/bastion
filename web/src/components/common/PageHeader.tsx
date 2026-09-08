import React from 'react';

export interface PageHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    action,
    badge,
}) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-800/80 mb-6">
            <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                        {title}
                    </h1>
                    {badge}
                </div>
                {description && (
                    <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">{description}</p>
                )}
            </div>
            {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
    );
};
