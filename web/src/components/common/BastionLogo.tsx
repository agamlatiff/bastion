import React from 'react';

interface BastionLogoProps {
    className?: string;
    size?: number | string;
}

/**
 * Bastion Brand Logo (The Fortress Hex-Vault)
 * An exclusive, modern architectural fortress & vault monogram.
 * Replaces the generic stock shield-check icon with a proprietary geometric brand identity.
 */
export const BastionLogo: React.FC<BastionLogoProps> = ({ className = 'w-5 h-5', size }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={size ? { width: size, height: size } : undefined}
            stroke="currentColor"
        >
            {/* Outer Fortress Rampart Shield */}
            <path
                d="M12 2.75L20 6.5V13C20 17.5 16.5 20.8 12 22C7.5 20.8 4 17.5 4 13V6.5L12 2.75Z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Inner Interlocking Double-Entry Vault Core */}
            <path
                d="M12 7.75L16 11.75L12 15.75L8 11.75L12 7.75Z"
                fill="currentColor"
                fillOpacity="0.25"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            {/* Vertical Alignment Keyline */}
            <line
                x1="12"
                y1="3.5"
                x2="12"
                y2="7.5"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
            <line
                x1="12"
                y1="16"
                x2="12"
                y2="20.5"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    );
};
