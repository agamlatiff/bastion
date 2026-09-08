import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {leftIcon && (
                        <div className="absolute left-3 flex items-center pointer-events-none text-zinc-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        id={inputId}
                        ref={ref}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        className={twMerge(
                            clsx(
                                'w-full bg-[#111114] border text-zinc-100 placeholder-zinc-600 text-xs sm:text-sm rounded-md px-3 py-2 transition-colors outline-none',
                                leftIcon && 'pl-9',
                                rightIcon && 'pr-9',
                                error
                                    ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                                    : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30',
                                className
                            )
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 flex items-center text-zinc-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={`${inputId}-error`} className="text-[11px] text-rose-400 font-medium">
                        {error}
                    </p>
                )}
                {!error && helperText && (
                    <p className="text-[11px] text-zinc-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
