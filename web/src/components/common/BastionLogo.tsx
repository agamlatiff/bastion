import React from 'react';

interface BastionLogoProps {
    className?: string;
    size?: number | string;
    variant?: 'default' | 'monochrome';
}

/**
 * Bastion Brand Logo (The Isometric B Monogram)
 * An exclusive, architectural isometric monogram forming the letter "B".
 * Constructed from interlocking modular balance blocks representing double-entry precision.
 * 100% free of shields, locks, and generic icons.
 */
export const BastionLogo: React.FC<BastionLogoProps> = ({
    className = 'w-5 h-5',
    size,
    variant = 'default',
}) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={size ? { width: size, height: size } : undefined}
        >
            {/* Left Vertical Pillar (The Spine) */}
            <path
                d="M4 6.75L8.5 4.15V19.85L4 17.25V6.75Z"
                fill="currentColor"
                fillOpacity="0.18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />

            {/* Top Loop (Upper Isometric Block) */}
            <path
                d="M8.5 4.15L15 7.9L19.5 5.3L13 1.55L8.5 4.15Z"
                fill={variant === 'default' ? '#38bdf8' : 'currentColor'}
                fillOpacity={variant === 'default' ? '0.9' : '0.4'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path
                d="M19.5 5.3V10.5L15 13.1V7.9L19.5 5.3Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path
                d="M8.5 12V9.4L15 13.1V15.7L8.5 12Z"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />

            {/* Bottom Loop (Lower Isometric Block) */}
            <path
                d="M8.5 12L15 15.7L19.5 13.1L13 9.4L8.5 12Z"
                fill={variant === 'default' ? '#38bdf8' : 'currentColor'}
                fillOpacity={variant === 'default' ? '0.9' : '0.4'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path
                d="M19.5 13.1V18.3L13 22.1L8.5 19.5L15 15.7L19.5 13.1Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />

            {/* Central Interlocking Accent Dot */}
            <circle
                cx="11.75"
                cy="11.75"
                r="1.2"
                fill={variant === 'default' ? '#38bdf8' : 'currentColor'}
            />
        </svg>
    );
};
