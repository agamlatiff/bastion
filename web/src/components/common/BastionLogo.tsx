import React from 'react';

interface BastionLogoProps {
    className?: string;
    size?: number | string;
    variant?: 'default' | 'monochrome';
}

/**
 * Bastion Brand Logo (Option C: The Architectural Monolith & Vault Arch)
 * Composed of 3 vertical architectural monoliths forming a fortress silhouette
 * with a luminous cyan vault gateway at its core.
 * Crisp, flat 2D geometry — 100% free of generic shields, locks, or 3D clutter.
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
            {/* Left Monolith Pillar */}
            <path
                d="M3 20V10L7.5 5.5V20H3Z"
                fill="currentColor"
            />

            {/* Center Monolith Pillar (Tallest Monolith with 45° Chamfer) */}
            <path
                d="M9.5 1.5L14.5 6.5V15.5L12 13L9.5 15.5V1.5Z"
                fill="currentColor"
            />

            {/* Right Monolith Pillar */}
            <path
                d="M16.5 5.5L21 10V20H16.5V5.5Z"
                fill="currentColor"
            />

            {/* Glowing Cyan Vault Arch / Keystone */}
            <path
                d="M12 13.8L6.5 19.3H17.5L12 13.8Z"
                fill={variant === 'default' ? '#00E5FF' : 'currentColor'}
            />

            {/* Subtle Negative Space Axis */}
            <path
                d="M12 13.8V19.3"
                stroke={variant === 'default' ? '#09090B' : 'transparent'}
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
};

