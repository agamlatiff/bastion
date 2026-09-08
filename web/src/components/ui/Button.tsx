import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            leftIcon,
            rightIcon,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.99]';

        const sizeStyles = {
            sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-medium',
            md: 'text-xs sm:text-sm px-3.5 py-2 gap-2 font-medium',
            lg: 'text-sm px-4 py-2.5 gap-2.5 font-medium',
        };

        const variantStyles = {
            primary:
                'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-sm hover:shadow transition-colors',
            secondary:
                'bg-zinc-900 hover:bg-zinc-800/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 shadow-sm',
            outline:
                'bg-transparent hover:bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white',
            danger:
                'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50',
            ghost:
                'bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={twMerge(
                    clsx(
                        baseStyles,
                        sizeStyles[size],
                        variantStyles[variant],
                        className
                    )
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
