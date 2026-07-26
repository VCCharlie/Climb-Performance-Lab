import React from 'react';
import { Bike } from 'lucide-react';

/**
 * Lucide bike with a short “knobby” ground line for mountain bike rides.
 */
const MtbRideIcon = ({ size = 16, className = '', title = 'Mountain Bike Ride' }) => {
    const bikeSize = Math.max(12, Math.round(size * 0.88));
    const groundH = Math.max(3, Math.round(size * 0.22));

    return (
        <span
            className={`relative inline-flex flex-col items-center justify-end shrink-0 leading-none ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={title}
            title={title}
        >
            <Bike size={bikeSize} strokeWidth={2} className="block" aria-hidden />
            <svg
                width={size}
                height={groundH}
                viewBox="0 0 24 4"
                className="block shrink-0"
                aria-hidden
            >
                <path
                    d="M2 3 L5 1 L8 3 L11 1 L14 3 L17 1 L20 3 L22 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
};

export default MtbRideIcon;
