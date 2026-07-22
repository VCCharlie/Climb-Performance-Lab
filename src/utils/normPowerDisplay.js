import { activityIntensityFactor } from './activityFilterMetrics.js';
import { getCogganZoneForIntensityFactor } from './cogganZoneForIntensity.js';

/**
 * NP display metadata for Activity Log — Coggan zone color scale vs profile FTP.
 * @param {number | null | undefined} normPowerWatts
 * @param {number | null | undefined} profileFtpWatts
 */
export function getNormPowerDisplay(normPowerWatts, profileFtpWatts) {
    const watts = Math.round(Number(normPowerWatts) || 0);
    const intensityFactor = activityIntensityFactor(normPowerWatts, profileFtpWatts);
    const zone = intensityFactor != null ? getCogganZoneForIntensityFactor(intensityFactor) : null;

    let title = '';
    if (watts > 0 && zone && intensityFactor != null) {
        title = `${watts} W — ${zone.name} (${(intensityFactor * 100).toFixed(0)}% FTP)`;
    } else if (watts > 0) {
        title = `${watts} W — set FTP in Settings for zone colors`;
    }

    return {
        watts,
        color: zone?.color ?? null,
        zoneName: zone?.name ?? null,
        intensityFactor,
        title,
    };
}
