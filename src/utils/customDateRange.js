/**
 * Helpers for custom date-range pickers (Dashboard preset, zone chart lookback, etc.).
 */

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeYmd(value) {
    if (!value || typeof value !== 'string') return '';
    return value.slice(0, 10);
}

/**
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isIsoYmd(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(normalizeYmd(value));
}

/**
 * @param {string | null | undefined} startYmd
 * @param {string | null | undefined} endYmd
 * @returns {boolean}
 */
export function isValidCustomDateRange(startYmd, endYmd) {
    const start = normalizeYmd(startYmd);
    const end = normalizeYmd(endYmd);
    if (!isIsoYmd(start) || !isIsoYmd(end)) return false;
    return start <= end;
}
