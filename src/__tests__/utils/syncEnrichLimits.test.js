import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SYNC_ENRICH_LIMITS,
    mergeSyncEnrichLimits,
    resolveSyncEnrichLimits,
    formatSyncEnrichLimitsSummary,
    clampEnrichLimit,
    SYNC_ENRICH_LIMIT_BOUNDS,
} from '../../utils/syncEnrichLimits.js';
import {
    SYNC_DRIFT_MAX_FETCHES_DEFAULT,
    SYNC_DRIFT_MAX_FETCHES_TODAY,
} from '../../utils/syncDriftEnrich.js';

describe('syncEnrichLimits', () => {
    it('mergeSyncEnrichLimits fills defaults for legacy saves', () => {
        const merged = mergeSyncEnrichLimits(null);
        expect(merged).toEqual(DEFAULT_SYNC_ENRICH_LIMITS);
    });

    it('clamps out-of-range values', () => {
        const merged = mergeSyncEnrichLimits({
            driftMaxFetches: 999,
            zoneTimesMaxFetches: -5,
            powerCurveMaxFetches: '12.7',
        });
        expect(merged.driftMaxFetches).toBe(SYNC_ENRICH_LIMIT_BOUNDS.driftMaxFetches.max);
        expect(merged.zoneTimesMaxFetches).toBe(0);
        expect(merged.powerCurveMaxFetches).toBe(13);
    });

    it('resolveSyncEnrichLimits reads nested userSettings', () => {
        const limits = resolveSyncEnrichLimits({
            syncEnrichLimits: { driftMaxFetches: 10 },
        });
        expect(limits.driftMaxFetches).toBe(10);
        expect(limits.driftMaxFetchesToday).toBe(DEFAULT_SYNC_ENRICH_LIMITS.driftMaxFetchesToday);
    });

    it('formatSyncEnrichLimitsSummary is stable', () => {
        const text = formatSyncEnrichLimitsSummary(DEFAULT_SYNC_ENRICH_LIMITS);
        expect(text).toContain('drift 8/12');
        expect(text).toContain('zones 25');
        expect(text).toContain('curves 40');
    });

    it('syncDriftEnrich constants stay aligned with defaults', () => {
        expect(SYNC_DRIFT_MAX_FETCHES_DEFAULT).toBe(DEFAULT_SYNC_ENRICH_LIMITS.driftMaxFetches);
        expect(SYNC_DRIFT_MAX_FETCHES_TODAY).toBe(DEFAULT_SYNC_ENRICH_LIMITS.driftMaxFetchesToday);
    });

    it('clampEnrichLimit handles NaN', () => {
        expect(clampEnrichLimit('n/a', 8, SYNC_ENRICH_LIMIT_BOUNDS.driftMaxFetches)).toBe(8);
    });
});
