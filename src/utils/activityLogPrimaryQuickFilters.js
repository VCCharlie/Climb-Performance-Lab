import { safeLocalStorageSet } from './safeStorage';
import {
    ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS,
    ACTIVITY_LOG_QUICK_FILTER_IDS,
} from './activityLogQuickFilterDefinitions';

export const PRIMARY_QUICK_FILTER_STORAGE_KEY = 'cpl.activityLogPrimaryQuickFilters.v1';

export const MAX_PRIMARY_QUICK_FILTERS = 8;

export const MIN_PRIMARY_QUICK_FILTERS = 1;

/** Default pills on the compact bar (mobile + desktop). */
export function getDefaultPrimaryQuickFilterIds() {
    return ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS
        .filter((d) => d.defaultOnBar)
        .map((d) => d.id);
}

/** Extra pills auto-shown on xl+ when not already in the user's bar selection. */
export function getDesktopExtraQuickFilterIds() {
    return ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS
        .filter((d) => d.desktopExtra)
        .map((d) => d.id);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizePrimaryQuickFilterIds(raw) {
    const fallback = getDefaultPrimaryQuickFilterIds();
    if (!Array.isArray(raw)) return fallback;

    const allowed = new Set(ACTIVITY_LOG_QUICK_FILTER_IDS);
    const seen = new Set();
    /** @type {string[]} */
    const out = [];

    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const id = item.trim();
        if (!allowed.has(id) || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= MAX_PRIMARY_QUICK_FILTERS) break;
    }

    if (out.length < MIN_PRIMARY_QUICK_FILTERS) return fallback;
    return out;
}

/**
 * @returns {string[]}
 */
export function readPrimaryQuickFilterIds() {
    if (typeof localStorage === 'undefined') return getDefaultPrimaryQuickFilterIds();
    try {
        const raw = localStorage.getItem(PRIMARY_QUICK_FILTER_STORAGE_KEY);
        if (!raw) return getDefaultPrimaryQuickFilterIds();
        return normalizePrimaryQuickFilterIds(JSON.parse(raw));
    } catch {
        return getDefaultPrimaryQuickFilterIds();
    }
}

/**
 * @param {string[]} ids
 */
export function writePrimaryQuickFilterIds(ids) {
    const normalized = normalizePrimaryQuickFilterIds(ids);
    safeLocalStorageSet(PRIMARY_QUICK_FILTER_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

/**
 * Visible ids for the bar at a breakpoint.
 * @param {string[]} selectedIds — user-pinned ids (persisted)
 * @param {boolean} wideDesktop — xl+ viewport
 */
export function resolveVisiblePrimaryQuickFilterIds(selectedIds, wideDesktop = false) {
    const base = normalizePrimaryQuickFilterIds(selectedIds);
    if (!wideDesktop) return base;

    const extras = getDesktopExtraQuickFilterIds().filter((id) => !base.includes(id));
    const merged = [...base];
    for (const id of extras) {
        if (merged.length >= MAX_PRIMARY_QUICK_FILTERS) break;
        merged.push(id);
    }
    return merged;
}

/**
 * @param {string[]} current
 * @param {string} id
 * @param {boolean} enabled
 */
export function togglePrimaryQuickFilterId(current, id, enabled) {
    const normalized = normalizePrimaryQuickFilterIds(current);
    if (!ACTIVITY_LOG_QUICK_FILTER_IDS.includes(id)) return normalized;

    if (enabled) {
        if (normalized.includes(id)) return normalized;
        if (normalized.length >= MAX_PRIMARY_QUICK_FILTERS) return normalized;
        return [...normalized, id];
    }

    if (normalized.length <= MIN_PRIMARY_QUICK_FILTERS) return normalized;
    return normalized.filter((item) => item !== id);
}
