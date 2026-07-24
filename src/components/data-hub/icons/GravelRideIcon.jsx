import React from 'react';
import { Bike } from 'lucide-react';

/**
 * Same crisp Lucide bike as Road Ride, plus a short dashed “surface” line for gravel.
 */
const GravelRideIcon = ({ size = 16, className = '', title = 'Gravel Ride' }) => {
    const bikeSize = Math.max(12, Math.round(size * 0.88));
    const groundH = Math.max(2, Math.round(size * 0.18));

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
                viewBox="0 0 24 3"
                className="block shrink-0"
                aria-hidden
            >
                <line
                    x1="2"
                    y1="1.5"
                    x2="22"
                    y2="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="3 2.5"
                />
            </svg>
        </span>
    );
};

export default GravelRideIcon;
