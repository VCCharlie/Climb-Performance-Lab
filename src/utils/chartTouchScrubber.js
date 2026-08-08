/**
 * Touch scrubber helpers for time-series Recharts (CTL / ATL / TSB timeline).
 * Pure functions — safe to unit test without a DOM.
 */

/** Long-press duration before scrub mode activates (ms). */
export const SCRUB_LONG_PRESS_MS = 350;

/** Minimum movement before a gesture direction is decided (px). */
export const SCRUB_GESTURE_THRESHOLD_PX = 8;

/** Horizontal movement must exceed vertical × this ratio to count as scrub. */
export const SCRUB_HORIZONTAL_BIAS = 1.25;

/**
 * Classify pointer movement as vertical scroll, horizontal scrub, or still pending.
 * @param {number} dx
 * @param {number} dy
 * @param {number} [threshold]
 * @returns {'pending' | 'vertical' | 'horizontal'}
 */
export function classifyTouchGesture(dx, dy, threshold = SCRUB_GESTURE_THRESHOLD_PX) {
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < threshold && ady < threshold) return 'pending';
    if (adx > ady * SCRUB_HORIZONTAL_BIAS) return 'horizontal';
    if (ady > adx) return 'vertical';
    return 'pending';
}

/**
 * Map a client X coordinate to the nearest data index on a linear time axis.
 *
 * @param {Array<Record<string, number>>} data
 * @param {number} clientX — viewport X of the pointer
 * @param {{ left: number, width: number, marginLeft?: number, marginRight?: number }} chartRect
 * @param {string} [xKey='dateNum']
 * @returns {number} index clamped to [0, data.length - 1]
 */
export function findNearestDataIndexByX(
    data,
    clientX,
    chartRect,
    xKey = 'dateNum',
) {
    if (!data?.length) return 0;

    const marginLeft = chartRect.marginLeft ?? 0;
    const marginRight = chartRect.marginRight ?? 0;
    const plotLeft = chartRect.left + marginLeft;
    const plotWidth = chartRect.width - marginLeft - marginRight;

    if (plotWidth <= 0) return data.length - 1;

    const minX = Number(data[0][xKey]);
    const maxX = Number(data[data.length - 1][xKey]);
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX) {
        return data.length - 1;
    }

    const ratio = Math.max(0, Math.min(1, (clientX - plotLeft) / plotWidth));
    const targetX = minX + ratio * (maxX - minX);

    let lo = 0;
    let hi = data.length - 1;

    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midX = Number(data[mid][xKey]);
        if (midX < targetX) lo = mid + 1;
        else hi = mid;
    }

    if (lo > 0) {
        const prevX = Number(data[lo - 1][xKey]);
        const currX = Number(data[lo][xKey]);
        if (Math.abs(targetX - prevX) < Math.abs(targetX - currX)) return lo - 1;
    }

    return lo;
}

/**
 * Round a numeric bound outward to a "nice" step for axis ticks.
 * @param {number} value
 * @param {'floor' | 'ceil'} mode
 * @param {number} step
 */
function roundBound(value, mode, step) {
    if (step <= 0) return value;
    if (mode === 'floor') return Math.floor(value / step) * step;
    return Math.ceil(value / step) * step;
}

/**
 * Y-axis domain for CTL / ATL / TSB charts.
 * Keeps TSB (often negative) and CTL/ATL lines readable on small screens.
 *
 * @param {Array<{ ctl?: number, atl?: number, tsb?: number }>} data
 * @param {{ paddingPct?: number, minPadding?: number }} [options]
 * @returns {[number, number]}
 */
export function computeFitnessChartYDomain(data, options = {}) {
    const paddingPct = options.paddingPct ?? 0.1;
    const minPadding = options.minPadding ?? 5;

    if (!data?.length) return [-10, 10];

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const row of data) {
        for (const key of ['ctl', 'atl', 'tsb']) {
            const n = Number(row[key]);
            if (!Number.isFinite(n)) continue;
            minVal = Math.min(minVal, n);
            maxVal = Math.max(maxVal, n);
        }
    }

    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return [-10, 10];

    const span = Math.max(maxVal - minVal, 1);
    const pad = Math.max(minPadding, span * paddingPct);

    let yMin = minVal - pad;
    let yMax = maxVal + pad;

    // Always include zero when TSB crosses or nears form line.
    if (minVal < 0 || maxVal > 0) {
        yMin = Math.min(yMin, 0);
        yMax = Math.max(yMax, 0);
    }

    const niceStep = span <= 20 ? 5 : span <= 60 ? 10 : 20;
    yMin = roundBound(yMin, 'floor', niceStep);
    yMax = roundBound(yMax, 'ceil', niceStep);

    if (yMin === yMax) {
        yMin -= niceStep;
        yMax += niceStep;
    }

    return [yMin, yMax];
}

/**
 * Default chart margins for scrub hit-testing (Recharts content box).
 * @param {boolean} isCompact — mobile / narrow viewport
 */
export function getScrubChartMargins(isCompact) {
    return {
        top: isCompact ? 4 : 5,
        right: isCompact ? 8 : 20,
        left: isCompact ? 36 : 44,
        bottom: isCompact ? 4 : 0,
    };
}
