import React from 'react';
import { getNormPowerDisplay } from '../../utils/normPowerDisplay.js';

/**
 * Normalized power with Coggan zone color (relative to profile FTP).
 */
export default function NormPowerCell({ watts, profileFtp, className = '', suffix = '' }) {
    const display = getNormPowerDisplay(watts, profileFtp);

    if (!display.watts) {
        return <span className="text-cdmuted">-</span>;
    }

    if (!display.color) {
        return (
            <span className={`font-bold text-cdmuted tabular-nums ${className}`.trim()} title={display.title}>
                {display.watts}{suffix}
            </span>
        );
    }

    return (
        <span
            className={`font-bold tabular-nums ${className}`.trim()}
            style={{ color: display.color }}
            title={display.title}
        >
            {display.watts}{suffix}
        </span>
    );
}
