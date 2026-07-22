import React from 'react';
import { activityIntensityFactor } from '../../utils/activityFilterMetrics.js';
import {
    getPowerZoneDisplay,
    getIntensityFactorZoneDisplay,
    getHeartRateZoneDisplay,
} from '../../utils/activityMetricZoneDisplay.js';

/**
 * Activity Log metric with Coggan zone color (power/IF vs FTP, HR vs max HR).
 */
export default function ZoneMetricCell({
    metric = 'power',
    value,
    normPower,
    profileFtp,
    profileMaxHr,
    className = '',
    suffix = '',
}) {
    let display;
    switch (metric) {
        case 'if': {
            const ifVal = activityIntensityFactor(normPower ?? value, profileFtp);
            if (ifVal == null) return <span className="text-cdmuted" title="Set FTP in Settings to compute IF">—</span>;
            display = getIntensityFactorZoneDisplay(ifVal);
            break;
        }
        case 'hr':
            display = getHeartRateZoneDisplay(value, profileMaxHr);
            break;
        case 'power':
        default:
            display = getPowerZoneDisplay(value, profileFtp);
            break;
    }

    if (!display.hasValue) {
        return <span className="text-cdmuted">-</span>;
    }

    if (!display.color) {
        return (
            <span
                className={`font-bold text-cdmuted tabular-nums ${className}`.trim()}
                title={display.title}
            >
                {display.displayValue}{suffix}
            </span>
        );
    }

    return (
        <span
            className={`font-bold tabular-nums ${className}`.trim()}
            style={{ color: display.color }}
            title={display.title}
        >
            {display.displayValue}{suffix}
        </span>
    );
}
