import { activityIntensityFactor, activityMovingTimeSec } from './activityFilterMetrics';

/** Activity log columns that must sort numerically (CSV may store some as strings). */
export const NUMERIC_ACTIVITY_SORT_KEYS = new Set([
    'distance',
    'climbing',
    'avg_speed',
    'norm_power',
    'avg_power',
    'load',
    'work',
    'rpe',
    'avg_hr',
    'max_hr',
    'max_power',
    'best_1min',
    'best_5min',
    'best_10min',
    'best_20min',
    'best_60min',
    'best_90min',
    'best_120min',
    'avg_altitude',
    'max_altitude',
    'ftp',
]);

function directionMultiplier(direction) {
    return direction === 'asc' ? 1 : -1;
}

function compareNumbers(aNum, bNum, direction) {
    const dir = directionMultiplier(direction);
    if (aNum < bNum) return -dir;
    if (aNum > bNum) return dir;
    return 0;
}

function compareStrings(aVal, bVal, direction) {
    const dir = directionMultiplier(direction);
    const aStr = String(aVal ?? '').toLowerCase();
    const bStr = String(bVal ?? '').toLowerCase();
    if (aStr < bStr) return -dir;
    if (aStr > bStr) return dir;
    return 0;
}

function numericSortValue(value, direction) {
    const n = Number(value);
    if (value != null && value !== '' && Number.isFinite(n)) return n;
    return direction === 'desc' ? -Infinity : Infinity;
}

/**
 * Compare two activity rows for table sorting.
 * Coerces numeric columns so CSV string distances (e.g. "80.8") sort correctly vs API numbers.
 *
 * @param {object} a
 * @param {object} b
 * @param {{ key: string, direction?: 'asc' | 'desc' }} sortConfig
 * @param {number} [profileFtp]
 * @returns {number}
 */
export function compareActivitiesForSort(a, b, sortConfig, profileFtp) {
    const direction = sortConfig.direction === 'asc' ? 'asc' : 'desc';
    const key = sortConfig.key;

    if (key === 'intensity_factor') {
        const fa = activityIntensityFactor(a.norm_power, profileFtp);
        const fb = activityIntensityFactor(b.norm_power, profileFtp);
        const nullSentinel = direction === 'desc' ? -Infinity : Infinity;
        return compareNumbers(
            fa != null ? fa : nullSentinel,
            fb != null ? fb : nullSentinel,
            direction,
        );
    }

    if (key === 'moving_time') {
        const nullSentinel = direction === 'desc' ? -Infinity : Infinity;
        const aSec = activityMovingTimeSec(a);
        const bSec = activityMovingTimeSec(b);
        return compareNumbers(
            aSec != null ? aSec : nullSentinel,
            bSec != null ? bSec : nullSentinel,
            direction,
        );
    }

    const aVal = a[key];
    const bVal = b[key];

    if (NUMERIC_ACTIVITY_SORT_KEYS.has(key)) {
        return compareNumbers(
            numericSortValue(aVal, direction),
            numericSortValue(bVal, direction),
            direction,
        );
    }

    return compareStrings(aVal, bVal, direction);
}
