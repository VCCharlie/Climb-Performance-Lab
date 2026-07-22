import { formatTime } from './formatters';
import { activityIntensityFactor } from './activityFilterMetrics';
import { getNormPowerDisplay } from './normPowerDisplay.js';

/** Columns rendered in the card header row — metrics come from the rest. */
export const ACTIVITY_CARD_HEADER_KEYS = new Set(['date', 'type', 'title']);

/**
 * Build compact metric chips for an activity card from visible column defs.
 * @returns {Array<{ key: string, label: string, value: string, tone?: 'np'|'load'|'muted' }>}
 */
export function getActivityCardMetrics(act, visibleColumns, profileFtp) {
    if (!act || !visibleColumns?.length) return [];

    return visibleColumns
        .filter((col) => !ACTIVITY_CARD_HEADER_KEYS.has(col.key))
        .map((col) => formatActivityCardMetric(col, act, profileFtp))
        .filter(Boolean);
}

function formatActivityCardMetric(col, act, profileFtp) {
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
            if (!display.watts) return null;
            return {
                key,
                label: col.label,
                value: `${display.watts} W`,
                tone: display.color ? 'zone' : 'muted',
                color: display.color,
                title: display.title,
            };
        }
        case 'load':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: String(Math.round(val)), tone: 'load' }
                : null;
        case 'avg_power':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: `${Math.round(val)} W`, tone: 'muted' }
                : null;
        case 'intensity_factor': {
            const ifVal = activityIntensityFactor(act.norm_power, profileFtp);
            return ifVal != null
                ? { key, label: col.label, value: ifVal.toFixed(2), tone: 'muted' }
                : null;
        }
        case 'avg_hr':
        case 'max_hr':
            return val != null && Number(val) > 0
                ? { key, label: col.label, value: `${Math.round(val)} bpm`, tone: 'muted' }
                : null;
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
