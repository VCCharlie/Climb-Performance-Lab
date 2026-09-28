/**
 * Caps for Full sync enrichment (Intervals detail fetches, HR drift streams).
 * Stored in userSettings.syncEnrichLimits; used by sync hooks and enrichment pipeline.
 */

export const SYNC_ENRICH_LIMIT_BOUNDS = {
    driftMaxFetches: { min: 1, max: 40 },
    driftMaxFetchesToday: { min: 1, max: 40 },
    zoneTimesMaxFetches: { min: 0, max: 80 },
    powerCurveMaxFetches: { min: 0, max: 80 },
};

/** @typedef {typeof DEFAULT_SYNC_ENRICH_LIMITS} SyncEnrichLimits */
export const DEFAULT_SYNC_ENRICH_LIMITS = {
    /** HR drift stream fetches after multi-day Fetch & merge / refresh. */
    driftMaxFetches: 8,
    /** HR drift cap for single-day sync (Sync today). */
    driftMaxFetchesToday: 12,
    /** Intervals activity-detail fetches for power/HR zone times (0 = list-only mapping). */
    zoneTimesMaxFetches: 25,
    /** Intervals power-curve fetches for missing long-duration bests (0 = skip). */
    powerCurveMaxFetches: 40,
};

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {{ min: number, max: number }} bounds
 * @returns {number}
 */
export function clampEnrichLimit(value, fallback, bounds) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const rounded = Math.round(n);
    if (rounded < bounds.min) return bounds.min;
    if (rounded > bounds.max) return bounds.max;
    return rounded;
}

/**
 * @param {Record<string, unknown> | null | undefined} partial
 * @returns {SyncEnrichLimits}
 */
export function mergeSyncEnrichLimits(partial) {
    const base = DEFAULT_SYNC_ENRICH_LIMITS;
    const src = partial && typeof partial === 'object' && !Array.isArray(partial) ? partial : {};
    return {
        driftMaxFetches: clampEnrichLimit(
            src.driftMaxFetches,
            base.driftMaxFetches,
            SYNC_ENRICH_LIMIT_BOUNDS.driftMaxFetches,
        ),
        driftMaxFetchesToday: clampEnrichLimit(
            src.driftMaxFetchesToday,
            base.driftMaxFetchesToday,
            SYNC_ENRICH_LIMIT_BOUNDS.driftMaxFetchesToday,
        ),
        zoneTimesMaxFetches: clampEnrichLimit(
            src.zoneTimesMaxFetches,
            base.zoneTimesMaxFetches,
            SYNC_ENRICH_LIMIT_BOUNDS.zoneTimesMaxFetches,
        ),
        powerCurveMaxFetches: clampEnrichLimit(
            src.powerCurveMaxFetches,
            base.powerCurveMaxFetches,
            SYNC_ENRICH_LIMIT_BOUNDS.powerCurveMaxFetches,
        ),
    };
}

/**
 * @param {{ syncEnrichLimits?: Record<string, unknown> } | null | undefined} userSettings
 * @returns {SyncEnrichLimits}
 */
export function resolveSyncEnrichLimits(userSettings) {
    return mergeSyncEnrichLimits(userSettings?.syncEnrichLimits);
}

/**
 * @param {SyncEnrichLimits} limits
 * @returns {string}
 */
export function formatSyncEnrichLimitsSummary(limits) {
    const l = mergeSyncEnrichLimits(limits);
    return `drift ${l.driftMaxFetches}/${l.driftMaxFetchesToday} (range/today), zones ${l.zoneTimesMaxFetches}, curves ${l.powerCurveMaxFetches}`;
}
