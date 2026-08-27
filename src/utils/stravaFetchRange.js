/**
 * Strava list API date windows — local calendar days with optional buffer for TZ edge cases.
 */

/**
 * Parse YYYY-MM-DD as local midnight (avoids UTC interpretation of date-only strings).
 * @param {string} ymd
 * @returns {Date}
 */
export function parseLocalYmd(ymd) {
    const parts = String(ymd || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
        return new Date(NaN);
    }
    const [year, month, day] = parts;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Format Date as YYYY-MM-DD in local timezone.
 * @param {Date} date
 * @returns {string}
 */
export function formatLocalYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Unix timestamps for Strava GET /athlete/activities after/before params.
 * Uses local calendar boundaries and expands by bufferDays on each side.
 *
 * @param {string} startYmd — inclusive start (local calendar day)
 * @param {string} endYmd — inclusive end (local calendar day)
 * @param {{ bufferDays?: number }} [opts]
 * @returns {{ afterTs: number, beforeTs: number }}
 */
export function stravaListTimestampsForYmdRange(startYmd, endYmd, opts = {}) {
    const bufferDays = Number.isFinite(opts.bufferDays) ? opts.bufferDays : 1;
    const start = parseLocalYmd(startYmd);
    const end = parseLocalYmd(endYmd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        const fallbackAfter = Math.floor(new Date(startYmd).getTime() / 1000);
        const fallbackBefore = Math.floor(new Date(endYmd).getTime() / 1000) + 86400;
        return { afterTs: fallbackAfter, beforeTs: fallbackBefore };
    }

    start.setDate(start.getDate() - bufferDays);
    end.setDate(end.getDate() + 1 + bufferDays);

    return {
        afterTs: Math.floor(start.getTime() / 1000),
        beforeTs: Math.floor(end.getTime() / 1000),
    };
}

/**
 * Calendar dates to check when matching Strava start_date_local to site rows (±1 day for TZ drift).
 * @param {string} ymd
 * @returns {string[]}
 */
export function adjacentLocalDateKeys(ymd) {
    const base = parseLocalYmd(ymd);
    if (Number.isNaN(base.getTime())) return [ymd];

    const prev = new Date(base);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(base);
    next.setDate(next.getDate() + 1);

    return [formatLocalYmd(prev), ymd, formatLocalYmd(next)];
}
