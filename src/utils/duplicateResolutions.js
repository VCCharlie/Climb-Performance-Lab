/**
 * Persist user choices from Tools → Duplicates so pairs are not re-prompted.
 * Stored in localStorage (device-local, not cloud).
 */

import { safeLocalStorageSet } from './safeStorage.js';

const STORAGE_KEY = 'climb_duplicate_pair_resolutions_v1';

/** @typedef {'keepA' | 'keepB' | 'keepBoth' | 'deleteBoth'} DuplicateResolutionAction */

/**
 * @typedef {object} DuplicateResolutionRecord
 * @property {DuplicateResolutionAction} action
 * @property {string|null} keptId
 * @property {string} recordedAt ISO timestamp
 */

function dateDay(activity) {
    const raw = activity?.date;
    if (!raw) return '';
    return String(raw).split('T')[0] || '';
}

function movingTimeSeconds(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !Number.isNaN(value)) return Math.max(0, Math.floor(value));
    const parts = String(value).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}

/**
 * Stable key for a pair of activities (order-independent).
 * @param {object} a
 * @param {object} b
 * @returns {string}
 */
export function duplicatePairKey(a, b) {
    const idA = String(a?.id ?? '');
    const idB = String(b?.id ?? '');
    return [idA, idB].sort().join('::');
}

/**
 * Fingerprint when activity ids change after re-import but metrics match.
 * @param {object} a
 * @param {object} b
 * @returns {string}
 */
export function duplicatePairFingerprint(a, b) {
    const day = dateDay(a) || dateDay(b);
    const distA = Number(a?.distance) || 0;
    const distB = Number(b?.distance) || 0;
    const dist = Math.round(((distA + distB) / 2) * 10) / 10;
    const durA = movingTimeSeconds(a?.moving_time);
    const durB = movingTimeSeconds(b?.moving_time);
    const dur = Math.round((durA + durB) / 2);
    const stravaA = a?.strava_id ? String(a.strava_id) : '';
    const stravaB = b?.strava_id ? String(b.strava_id) : '';
    const stravaPart = [stravaA, stravaB].filter(Boolean).sort().join('|') || 'no-strava';
    return `${day}|${dist}|${dur}|${stravaPart}`;
}

function loadStore() {
    if (typeof localStorage === 'undefined') {
        return { byPairKey: {}, byFingerprint: {} };
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { byPairKey: {}, byFingerprint: {} };
        const parsed = JSON.parse(raw);
        return {
            byPairKey: parsed?.byPairKey && typeof parsed.byPairKey === 'object' ? parsed.byPairKey : {},
            byFingerprint: parsed?.byFingerprint && typeof parsed.byFingerprint === 'object' ? parsed.byFingerprint : {},
        };
    } catch {
        return { byPairKey: {}, byFingerprint: {} };
    }
}

function saveStore(store) {
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(store));
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {DuplicateResolutionRecord|null}
 */
export function getDuplicatePairResolution(a, b) {
    const store = loadStore();
    const key = duplicatePairKey(a, b);
    if (store.byPairKey[key]) return store.byPairKey[key];
    const fp = duplicatePairFingerprint(a, b);
    return store.byFingerprint[fp] || null;
}

/**
 * @param {object} a
 * @param {object} b
 * @param {DuplicateResolutionAction} action
 */
export function recordDuplicatePairResolution(a, b, action) {
    const keptId = action === 'keepA'
        ? String(a.id)
        : action === 'keepB'
            ? String(b.id)
            : null;

    const record = {
        action,
        keptId,
        recordedAt: new Date().toISOString(),
    };

    const store = loadStore();
    const key = duplicatePairKey(a, b);
    const fp = duplicatePairFingerprint(a, b);
    store.byPairKey[key] = record;
    store.byFingerprint[fp] = record;
    saveStore(store);
    return record;
}

/**
 * Pairs the user marked as "not duplicates" (keep both) should not reappear.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function shouldHideDuplicatePair(a, b) {
    const resolution = getDuplicatePairResolution(a, b);
    return resolution?.action === 'keepBoth';
}

/**
 * @param {Array<{ a: object, b: object, reason?: string }>} duplicates
 * @returns {Array<{ a: object, b: object, reason?: string, savedResolution?: DuplicateResolutionRecord|null }>}
 */
export function filterStoredDuplicatePairs(duplicates) {
    return (duplicates || [])
        .filter((dup) => !shouldHideDuplicatePair(dup.a, dup.b))
        .map((dup) => ({
            ...dup,
            savedResolution: getDuplicatePairResolution(dup.a, dup.b) || null,
        }));
}

/**
 * @param {DuplicateResolutionRecord|null|undefined} saved
 * @returns {string|null}
 */
export function duplicateResolutionSummary(saved) {
    if (!saved) return null;
    switch (saved.action) {
        case 'keepA': return 'Previously: kept Version A';
        case 'keepB': return 'Previously: kept Version B';
        case 'keepBoth': return 'Previously: kept both';
        case 'deleteBoth': return 'Previously: deleted both';
        default: return null;
    }
}
