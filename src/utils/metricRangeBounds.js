import { parseDurationToSeconds } from './formatters';

/**
 * @typedef {{ min: number, max: number, count: number }} MetricRangeBounds
 */

/**
 * @param {unknown[]} activities
 * @returns {MetricRangeBounds | null}
 */
export function computeDistanceBoundsFromActivities(activities) {
    if (!Array.isArray(activities) || activities.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (const a of activities) {
        const dist = Number(a?.distance);
        if (Number.isNaN(dist) || dist <= 0) continue;
        min = Math.min(min, dist);
        max = Math.max(max, dist);
        count += 1;
    }

    if (count === 0 || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min === max) {
        return { min: Math.max(0, min - 1), max: max + 1, count };
    }
    return { min, max, count };
}

/**
 * Duration bounds in minutes (matches filterDurMinMin / filterDurMaxMin).
 * @param {unknown[]} activities
 * @returns {MetricRangeBounds | null}
 */
export function computeDurationBoundsFromActivities(activities) {
    if (!Array.isArray(activities) || activities.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (const a of activities) {
        const sec = parseDurationToSeconds(a?.moving_time);
        if (!sec || sec <= 0) continue;
        const minVal = sec / 60;
        min = Math.min(min, minVal);
        max = Math.max(max, minVal);
        count += 1;
    }

    if (count === 0 || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min === max) {
        return { min: Math.max(0, min - 1), max: max + 1, count };
    }
    return { min: Math.floor(min), max: Math.ceil(max), count };
}

/**
 * @param {number} value
 * @param {number} step
 */
export function snapMetricStep(value, step = 1) {
    if (!Number.isFinite(value)) return 0;
    if (step >= 1) return Math.round(value / step) * step;
    const factor = 1 / step;
    return Math.round(value * factor) / factor;
}

/**
 * Sync dual-range values to filter handlers; clears when spanning full dataset bounds.
 * @param {number} low
 * @param {number} high
 * @param {MetricRangeBounds} bounds
 * @param {(v: string) => void} onMinChange
 * @param {(v: string) => void} onMaxChange
 * @param {number} [step]
 */
export function applyDualRangeToMetricFilters(low, high, bounds, onMinChange, onMaxChange, step = 1) {
    const snappedLow = snapMetricStep(low, step);
    const snappedHigh = snapMetricStep(high, step);
    const atFullRange = snappedLow <= bounds.min && snappedHigh >= bounds.max;

    if (atFullRange) {
        onMinChange('');
        onMaxChange('');
        return;
    }

    onMinChange(String(snappedLow));
    onMaxChange(String(snappedHigh));
}

/**
 * @param {string} minValue
 * @param {string} maxValue
 * @param {MetricRangeBounds} bounds
 */
export function readDualRangeValues(minValue, maxValue, bounds) {
    const low = minValue === '' || minValue == null
        ? bounds.min
        : Number(minValue);
    const high = maxValue === '' || maxValue == null
        ? bounds.max
        : Number(maxValue);

    return {
        low: Number.isFinite(low) ? low : bounds.min,
        high: Number.isFinite(high) ? high : bounds.max,
    };
}
