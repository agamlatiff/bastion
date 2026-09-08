import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={twMerge(
                clsx(
                    'rounded-lg border border-zinc-800/80 bg-[#111114] text-zinc-100',
                    className
                )
            )}
            {...props}
        />
    )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={twMerge(clsx('flex flex-col space-y-1 p-4 sm:p-5', className))}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={twMerge(clsx('text-sm font-semibold tracking-tight text-zinc-100', className))}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={twMerge(clsx('text-xs text-zinc-400 leading-relaxed', className))}
            {...props}
        />
    )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge(clsx('p-4 sm:p-5 pt-0', className))} {...props} />
    )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={twMerge(clsx('flex items-center p-4 sm:p-5 pt-0 border-t border-zinc-800/60 mt-4', className))}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';
