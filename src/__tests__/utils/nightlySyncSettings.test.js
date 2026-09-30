import { describe, it, expect } from 'vitest';
import { resolveNightlySyncContext } from '../../utils/nightlySyncSettings.js';
import { DEFAULT_SYNC_ENRICH_LIMITS } from '../../utils/syncEnrichLimits.js';

describe('nightlySyncSettings', () => {
    it('uses defaultSyncRangeDays and Fast depth from merged settings', () => {
        const ctx = resolveNightlySyncContext({
            defaultSyncRangeDays: 21,
            defaultIntervalsSyncDepth: 'fast',
        }, { settingsDocId: 'user_abc123' });

        expect(ctx.lookbackDays).toBe(21);
        expect(ctx.syncDepth).toBe('fast');
        expect(ctx.isFullSync).toBe(false);
        expect(ctx.mergeOpts.ownerUid).toBe('abc123');
    });

    it('Full depth enables full pipeline flags and enrich limits', () => {
        const ctx = resolveNightlySyncContext({
            defaultIntervalsSyncDepth: 'full',
            ftp: 265,
            syncEnrichLimits: { ...DEFAULT_SYNC_ENRICH_LIMITS, driftMaxFetches: 12 },
        });

        expect(ctx.isFullSync).toBe(true);
        expect(ctx.profileFtp).toBe(265);
        expect(ctx.enrichLimits.driftMaxFetches).toBe(12);
        expect(ctx.mergeOpts.dataSourcePrefs).toBeTruthy();
    });
});
