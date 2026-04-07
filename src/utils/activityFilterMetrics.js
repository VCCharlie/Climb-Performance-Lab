/**
 * Normalized metrics for activity log filters (handles mixed CSV/API shapes).
 */

import { parseDurationToSeconds } from './formatters';

/**
 * @param {object} a
 * @returns {number | null} distance in km
 */
export function activityDistanceKm(a) {
    const d = Number(a?.distance);
    if (!d || Number.isNaN(d)) return null;
    return d > 2000 ? d / 1000 : d;
}

/**
 * @param {object} a
 * @returns {number | null} moving time in seconds
 */
export function activityMovingTimeSec(a) {
    const t = a?.moving_time;
    if (t == null || t === '') return null;
    if (typeof t === 'number' && !Number.isNaN(t) && t >= 0) return t;
    const s = parseDurationToSeconds(String(t));
    return s > 0 ? s : null;
}

/**
 * @param {object} a
 * @param {number | null} distKm
 * @param {number | null} timeSec
 * @returns {number | null} km/h
 */
export function activityAvgSpeedKmh(a, distKm, timeSec) {
    const stored = Number(a?.avg_speed);
    if (stored > 0 && stored < 90 && !Number.isNaN(stored)) return stored;
    if (distKm != null && timeSec != null && timeSec > 30) {
        const h = timeSec / 3600;
        if (h > 0) return distKm / h;
    }
    return null;
}

/**
 * @param {string | number} str
 * @returns {number | null} null = no bound
 */
export function parseNumericBound(str) {
    if (str === '' || str == null) return null;
    const n = Number(str);
    return Number.isNaN(n) ? null : n;
}

/**
 * @param {number | null} value
 * @param {number | null} min
 * @param {number | null} max
 * @param {{ requireValue?: boolean }} [opts]
 */
export function inNumericRange(value, min, max, opts = {}) {
    const { requireValue = false } = opts;
    if (value == null || Number.isNaN(value)) {
        return !requireValue && min == null && max == null;
    }
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
}
