import { calculateBassettCorrection } from './calculations';

/** Same sanity ceiling as dashboard eFTP cards — estimates above this are discarded. */
const MAX_DISPLAY_EFTP_W = 600;

const CACHE_MAX_ENTRIES = 6000;

/** @type {Map<string, object>} */
const enhanceCache = new Map();

/**
 * Cache key from fields that affect enhanceActivity output.
 * @param {object} d
 * @param {number} userFtp
 */
function enhanceCacheKey(d, userFtp) {
    const id = d?.id != null ? String(d.id) : '';
    return [
        id,
        userFtp,
        d?.best_20min ?? '',
        d?.best_60min ?? '',
        d?.avg_power ?? '',
        d?.avg_altitude ?? '',
        d?.ftp ?? '',
    ].join('|');
}

function trimEnhanceCache() {
    if (enhanceCache.size <= CACHE_MAX_ENTRIES) return;
    const removeCount = enhanceCache.size - CACHE_MAX_ENTRIES;
    const keys = enhanceCache.keys();
    for (let i = 0; i < removeCount; i++) {
        const { value: k } = keys.next();
        if (k === undefined) break;
        enhanceCache.delete(k);
    }
}

/**
 * Enriches a single activity with dashboard-derived fields (eFTP, sea-level power).
 * Results are memoized per activity id + relevant power fields + user FTP.
 *
 * @param {object} d Raw activity row
 * @param {number} userFtp Profile FTP fallback
 * @returns {object}
 */
export function enhanceActivity(d, userFtp) {
    const key = enhanceCacheKey(d, userFtp);
    const cached = enhanceCache.get(key);
    if (cached) return cached;

    let eFTP = d.best_20min ? Math.round(d.best_20min * 0.95) : null;
    let eFTP60 = d.best_60min ? Math.round(d.best_60min) : null;

    if (eFTP > MAX_DISPLAY_EFTP_W) eFTP = null;
    if (eFTP60 > MAX_DISPLAY_EFTP_W) eFTP60 = null;

    const seaLevelPower = d.avg_altitude
        ? calculateBassettCorrection(d.avg_power, d.avg_altitude)
        : null;

    const enriched = {
        ...d,
        eFTP,
        eFTP60,
        ftp: d.ftp || userFtp,
        seaLevelPower,
    };

    enhanceCache.set(key, enriched);
    trimEnhanceCache();
    return enriched;
}

/**
 * Map + sort helper for dashboard chart pipelines.
 * @param {object[]} activities
 * @param {number} userFtp
 */
export function enhanceAndSortActivities(activities, userFtp) {
    if (!activities?.length) return [];
    return activities
        .map((a) => enhanceActivity(a, userFtp))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Test-only: reset memo between cases. */
export function clearEnhanceActivityCache() {
    enhanceCache.clear();
}
