/**
 * Helpers for custom date-range pickers (Dashboard preset, zone chart lookback, etc.).
 */

import { parseNlDmyToIso } from './formatters';

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeYmd(value) {
    if (!value || typeof value !== 'string') return '';
    return value.slice(0, 10);
}

/**
 * Resolve draft input to ISO YYYY-MM-DD (accepts ISO or dd/mm/yyyy and dd-mm-yyyy).
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function resolveDraftYmd(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const parsed = parseNlDmyToIso(raw);
    return parsed ? parsed.slice(0, 10) : normalizeYmd(raw);
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
    const start = resolveDraftYmd(startYmd);
    const end = resolveDraftYmd(endYmd);
    if (!isIsoYmd(start) || !isIsoYmd(end)) return false;
    return start <= end;
}

/**
 * Whether the Apply button should be enabled for a custom date range picker.
 * Enabled when both dates parse and are ordered; does not require a diff from applied state.
 * @param {string | null | undefined} draftStartYmd
 * @param {string | null | undefined} draftEndYmd
 * @returns {boolean}
 */
export function isCustomDateApplyEnabled(draftStartYmd, draftEndYmd) {
    return isValidCustomDateRange(draftStartYmd, draftEndYmd);
}
