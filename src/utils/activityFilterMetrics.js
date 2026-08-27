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
    return d;
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
 * Intensity factor IF = NP ÷ FTP (profile FTP from settings, not stored on activity).
 * @returns {number | null}
 */
export function activityIntensityFactor(normPowerWatts, profileFtpWatts) {
    const np = Number(normPowerWatts);
    const ftp = Number(profileFtpWatts);
    if (!Number.isFinite(np) || np <= 0 || !Number.isFinite(ftp) || ftp <= 0) return null;
    return np / ftp;
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

/** Activity fields for aerobic drift % filters (Dec / Thr / Race columns). */
export const DRIFT_PCT_FIELDS = ['decoupling_pct', 'threshold_drift_pct', 'race_drift_pct'];

/**
 * @param {object | null | undefined} activity
 * @param {'decoupling_pct' | 'threshold_drift_pct' | 'race_drift_pct'} field
 * @returns {number | null}
 */
export function activityDriftPct(activity, field) {
    const raw = activity?.[field];
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * Drift % min/max filter — only activities with a finite drift value match when bounds are set.
 * @param {object | null | undefined} activity
 * @param {'decoupling_pct' | 'threshold_drift_pct' | 'race_drift_pct'} field
 * @param {number | null} min
 * @param {number | null} max
 * @returns {boolean}
 */
export function activityMatchesDriftRange(activity, field, min, max) {
    if (min == null && max == null) return true;
    const val = activityDriftPct(activity, field);
    return inNumericRange(val, min, max, { requireValue: true });
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

/**
 * Plain-text activity description for log search (Strava/Intervals HTML stripped).
 * @param {object | null | undefined} activity
 * @returns {string}
 */
export function activityDescriptionSearchText(activity) {
    const raw = activity?.description || activity?.notes || '';
    if (!raw || typeof raw !== 'string') return '';
    return raw
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Whether an activity matches the Activity Log free-text search (title, description, date).
 * @param {object | null | undefined} activity
 * @param {string} searchLower already lowercased query; empty string matches all
 * @returns {boolean}
 */
export function activityMatchesLogSearch(activity, searchLower) {
    if (!searchLower) return true;

    const title = activity?.title;
    if (title && String(title).toLowerCase().includes(searchLower)) return true;

    const description = activityDescriptionSearchText(activity);
    if (description && description.toLowerCase().includes(searchLower)) return true;

    const dateRaw = activity?.date;
    if (!dateRaw) return false;

    if (String(dateRaw).includes(searchLower)) return true;

    const ymdMatch = String(dateRaw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
        const year = ymdMatch[1];
        const monthStr = ymdMatch[2];
        const dayStr = ymdMatch[3];
        const dayNum = parseInt(dayStr, 10);
        const monthNum = parseInt(monthStr, 10);
        const dmy = `${dayNum}-${monthNum}-${year}`;
        const ddmm = `${dayStr}-${monthStr}-${year}`;
        if (dmy.includes(searchLower) || ddmm.includes(searchLower)) return true;
        return false;
    }

    try {
        const d = new Date(dateRaw);
        if (!Number.isNaN(d.getTime())) {
            const day = d.getDate();
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            const dmy = `${day}-${month}-${year}`;
            const ddmm = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
            if (dmy.includes(searchLower) || ddmm.includes(searchLower)) return true;
        }
    } catch {
        /* invalid date */
    }

    return false;
}
