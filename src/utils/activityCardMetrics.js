import { formatTime } from './formatters';
import { activityIntensityFactor } from './activityFilterMetrics';
import {
    getNormPowerDisplay,
    getPowerZoneDisplay,
    getIntensityFactorZoneDisplay,
    getHeartRateZoneDisplay,
} from './activityMetricZoneDisplay.js';
import { activityEfficiencyFactor, activityVariabilityIndex } from './rideInsights';
import { driftColumnAppliesToRide } from './coach/rideDurability';

/** Columns rendered in the card header row — metrics come from the rest. */
export const ACTIVITY_CARD_HEADER_KEYS = new Set(['date', 'type', 'title']);

/**
 * Build compact metric chips for an activity card from visible column defs.
 * @returns {Array<{ key: string, label: string, value: string, tone?: string, color?: string, title?: string }>}
 */
export function getActivityCardMetrics(act, visibleColumns, profileFtp, profileMaxHr) {
    if (!act || !visibleColumns?.length) return [];

    return visibleColumns
        .filter((col) => !ACTIVITY_CARD_HEADER_KEYS.has(col.key))
        .map((col) => formatActivityCardMetric(col, act, profileFtp, profileMaxHr))
        .filter(Boolean);
}

function zoneChip(key, label, display, valueSuffix = '') {
    if (!display?.hasValue) return null;
    return {
        key,
        label,
        value: `${display.displayValue}${valueSuffix}`,
        tone: display.color ? 'zone' : 'muted',
        color: display.color,
        title: display.title,
    };
}

function formatActivityCardMetric(col, act, profileFtp, profileMaxHr) {
    const key = col.key;
    const val = act[key];

    switch (key) {
        case 'moving_time':
            return val ? { key, label: col.label, value: formatTime(val), tone: 'muted' } : null;
        case 'distance':
            return val != null && !Number.isNaN(Number(val))
                ? { key, label: col.label, value: `${Number(val).toFixed(1)} km`, tone: 'muted' }
                : null;
        case 'climbing':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: `${Math.round(val)} m`, tone: 'muted' }
                : null;
        case 'avg_speed':
            return val != null && !Number.isNaN(Number(val))
                ? { key, label: col.label, value: `${Number(val).toFixed(1)} km/h`, tone: 'muted' }
                : null;
        case 'norm_power': {
            const display = getNormPowerDisplay(val, profileFtp);
            return zoneChip(key, col.label, { ...display, hasValue: display.watts > 0, displayValue: String(display.watts) }, ' W');
        }
        case 'load':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: String(Math.round(val)), tone: 'load' }
                : null;
        case 'avg_power':
            return zoneChip(key, col.label, getPowerZoneDisplay(val, profileFtp), ' W');
        case 'intensity_factor': {
            const ifVal = activityIntensityFactor(act.norm_power, profileFtp);
            if (ifVal == null) return null;
            return zoneChip(key, col.label, getIntensityFactorZoneDisplay(ifVal));
        }
        case 'variability_index': {
            const vi = activityVariabilityIndex(act.norm_power, act.avg_power);
            if (vi == null) return null;
            return {
                key,
                label: col.label,
                value: vi.toFixed(2),
                tone: 'muted',
                title: 'Variability Index (NP ÷ average power)',
            };
        }
        case 'efficiency_factor': {
            const ef = activityEfficiencyFactor(act.norm_power, act.avg_hr);
            if (ef == null) return null;
            return {
                key,
                label: col.label,
                value: ef.toFixed(2),
                tone: 'muted',
                title: 'Efficiency Factor (NP ÷ average HR, W/bpm)',
            };
        }
        case 'decoupling_pct':
        case 'threshold_drift_pct':
        case 'race_drift_pct': {
            if (!Number.isFinite(Number(val))) {
                if (!driftColumnAppliesToRide(key, act, profileFtp)) return null;
                return {
                    key,
                    label: col.label,
                    value: '—',
                    tone: 'muted',
                    title: `${col.pickerLabel || col.label}: not analyzed yet — run Decoupling backfill in Activities`,
                };
            }
            const statusKey = key === 'decoupling_pct'
                ? 'decoupling_status'
                : key === 'threshold_drift_pct'
                    ? 'threshold_drift_status'
                    : 'race_drift_status';
            return {
                key,
                label: col.label,
                value: `${Number(val).toFixed(1)}%`,
                tone: 'muted',
                title: act[statusKey] || col.pickerLabel || col.label,
            };
        }
        case 'avg_hr':
        case 'max_hr':
            return zoneChip(key, col.label, getHeartRateZoneDisplay(val, profileMaxHr), ' bpm');
        case 'work':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: `${Math.round(val)} kJ`, tone: 'muted' }
                : null;
        case 'rpe':
            return val ? { key, label: col.label, value: String(val), tone: 'muted' } : null;
        case 'gear_name': {
            const name = typeof val === 'string' ? val.trim() : '';
            return name ? { key, label: col.label, value: name, tone: 'muted' } : null;
        }
        case 'strava_kom_summary': {
            const s = act.strava_kom_summary;
            const label = s?.label && String(s.label).trim();
            return label ? { key, label: col.label, value: label, tone: 'muted' } : null;
        }
        case 'best_1min':
        case 'best_5min':
        case 'best_10min':
        case 'best_20min':
        case 'best_60min':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: `${Math.round(val)} W`, tone: 'muted' }
                : null;
        default:
            return val != null && val !== ''
                ? { key, label: col.label, value: String(Math.round(Number(val)) || val), tone: 'muted' }
                : null;
    }
}
