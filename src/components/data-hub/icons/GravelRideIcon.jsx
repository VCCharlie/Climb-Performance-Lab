import React from 'react';

/**
 * Bike with a dotted gravel surface underneath (distinct from plain Ride / VirtualRide).
 */
const GravelRideIcon = ({ size = 16, className = '', title = 'Gravel Ride' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        role="img"
        aria-label={title}
    >
        <title>{title}</title>
        <circle cx="5.5" cy="13.5" r="2.5" />
        <circle cx="18.5" cy="13.5" r="2.5" />
        <path d="M5.5 13.5 L10 6.5 L13.5 9 L18.5 13.5" />
        <path d="M10 6.5 L10 4" />
        <path d="M13.5 9 L16 6" />
        <path d="M2 17.5 Q6 16.2 9 17.5 T15 17.2 T22 17.5" strokeWidth="1.5" />
        <circle cx="4" cy="19" r="0.55" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="18.3" r="0.45" fill="currentColor" stroke="none" />
        <circle cx="11" cy="19.2" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="18.4" r="0.45" fill="currentColor" stroke="none" />
        <circle cx="18" cy="19" r="0.55" fill="currentColor" stroke="none" />
        <circle cx="20.5" cy="18.2" r="0.4" fill="currentColor" stroke="none" />
    </svg>
);

export default GravelRideIcon;
