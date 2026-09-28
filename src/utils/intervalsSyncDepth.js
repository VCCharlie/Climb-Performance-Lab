/**
 * Intervals.icu sync depth: fast (Intervals only) vs full (Strava + drift pipeline).
 */

import { safeLocalStorageSet } from './safeStorage.js';

export const INTERVALS_SYNC_DEPTH_STORAGE_KEY = 'cpl.intervalsSyncDepth.v1';

export const SYNC_DEPTH_FAST = 'fast';
export const SYNC_DEPTH_FULL = 'full';

const VALID = new Set([SYNC_DEPTH_FAST, SYNC_DEPTH_FULL]);

/**
 * @returns {'fast' | 'full'}
 */
export function readPersistedSyncDepth() {
    if (typeof localStorage === 'undefined') return SYNC_DEPTH_FAST;
    try {
        const raw = localStorage.getItem(INTERVALS_SYNC_DEPTH_STORAGE_KEY);
        if (raw && VALID.has(raw)) return raw;
    } catch {
        /* private mode */
    }
    return SYNC_DEPTH_FAST;
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
