import { activityIntensityFactor } from './activityFilterMetrics.js';
import { getCogganZoneForIntensityFactor } from './cogganZoneForIntensity.js';

/**
 * @param {number | null | undefined} intensityFactor
 * @param {string} valueLabel
 * @param {string} referenceLabel e.g. "FTP" or "max HR"
 */
function buildZoneMetricDisplay(intensityFactor, valueLabel, referenceLabel) {
    const zone = intensityFactor != null ? getCogganZoneForIntensityFactor(intensityFactor) : null;
    const hasValue = Boolean(valueLabel);

    let title = '';
    if (hasValue && zone && intensityFactor != null) {
        title = `${valueLabel} — ${zone.name} (${(intensityFactor * 100).toFixed(0)}% ${referenceLabel})`;
    } else if (hasValue) {
        title = `${valueLabel} — set ${referenceLabel} in Settings for zone colors`;
    }

    return {
        displayValue: valueLabel,
        color: zone?.color ?? null,
        zoneName: zone?.name ?? null,
        intensityFactor,
        title,
        hasValue,
    };
}

/** HR ÷ profile max HR — same ratio scale as power zones for consistent colors. */
export function activityHeartRateIntensityFactor(bpm, profileMaxHr) {
    const hr = Number(bpm);
    const maxHr = Number(profileMaxHr);
    if (!Number.isFinite(hr) || hr <= 0 || !Number.isFinite(maxHr) || maxHr <= 0) return null;
    return hr / maxHr;
}

/** Power (watts) vs profile FTP. */
export function getPowerZoneDisplay(watts, profileFtp) {
    const rounded = Math.round(Number(watts) || 0);
    const intensityFactor = activityIntensityFactor(watts, profileFtp);
    return {
        ...buildZoneMetricDisplay(intensityFactor, rounded > 0 ? String(rounded) : '', 'FTP'),
        watts: rounded,
    };
}

/** Normalized power — alias for power zone display. */
export function getNormPowerDisplay(normPowerWatts, profileFtp) {
    return getPowerZoneDisplay(normPowerWatts, profileFtp);
}

/** Intensity factor (NP ÷ FTP) — value is already a ratio. */
export function getIntensityFactorZoneDisplay(intensityFactor) {
    const ifVal = Number(intensityFactor);
    if (!Number.isFinite(ifVal) || ifVal <= 0) {
        return buildZoneMetricDisplay(null, '', 'FTP');
    }
    return buildZoneMetricDisplay(ifVal, ifVal.toFixed(2), 'FTP');
}

/** Heart rate vs profile max HR. */
export function getHeartRateZoneDisplay(bpm, profileMaxHr) {
    const rounded = Math.round(Number(bpm) || 0);
    const intensityFactor = activityHeartRateIntensityFactor(bpm, profileMaxHr);
    return {
        ...buildZoneMetricDisplay(intensityFactor, rounded > 0 ? String(rounded) : '', 'max HR'),
        bpm: rounded,
    };
}
