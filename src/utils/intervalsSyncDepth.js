/**
 * Intervals.icu sync depth: fast (Intervals only) vs full (Strava + drift pipeline).
 */

import { safeLocalStorageSet } from './safeStorage.js';

export const INTERVALS_SYNC_DEPTH_STORAGE_KEY = 'cpl.intervalsSyncDepth.v1';

export const SYNC_DEPTH_FAST = 'fast';
export const SYNC_DEPTH_FULL = 'full';

const VALID = new Set([SYNC_DEPTH_FAST, SYNC_DEPTH_FULL]);

/**
 * @param {'fast' | 'full' | string | undefined} [settingsDefault] from userSettings.defaultIntervalsSyncDepth
 * @returns {'fast' | 'full'}
 */
export function readPersistedSyncDepth(settingsDefault) {
    const fallback = normalizeSyncDepth(settingsDefault ?? SYNC_DEPTH_FAST);
    if (typeof localStorage === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(INTERVALS_SYNC_DEPTH_STORAGE_KEY);
        if (raw && VALID.has(raw)) return raw;
    } catch {
        /* private mode */
    }
    return fallback;
}

/**
 * @param {object | null | undefined} userSettings
 * @returns {'fast' | 'full'}
 */
export function resolveInitialSyncDepth(userSettings) {
    return readPersistedSyncDepth(userSettings?.defaultIntervalsSyncDepth);
}

/**
 * @param {'fast' | 'full' | string | undefined} depth
 * @returns {string}
 */
export function describeSyncDepth(depth) {
    return isFullSyncDepth(depth)
        ? 'Full (Intervals + Strava link/enrich + HR drift when enabled)'
        : 'Fast (Intervals fetch and save only)';
}

/**
 * @param {'fast' | 'full'} depth
 */
export function writePersistedSyncDepth(depth) {
    if (!VALID.has(depth)) return;
    safeLocalStorageSet(INTERVALS_SYNC_DEPTH_STORAGE_KEY, depth);
}

/**
 * @param {'fast' | 'full' | string | undefined} depth
 * @returns {boolean}
 */
export function isFullSyncDepth(depth) {
    return depth === SYNC_DEPTH_FULL;
}

/**
 * @param {'fast' | 'full' | string | undefined} depth
 * @returns {'fast' | 'full'}
 */
export function normalizeSyncDepth(depth) {
    return depth === SYNC_DEPTH_FULL ? SYNC_DEPTH_FULL : SYNC_DEPTH_FAST;
}
