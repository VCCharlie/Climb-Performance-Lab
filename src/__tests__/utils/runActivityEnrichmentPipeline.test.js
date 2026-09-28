/**
 * Tests for runActivityEnrichmentPipeline zone-times integration
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runActivityEnrichmentPipeline } from '../../utils/enrichment/runActivityEnrichmentPipeline';

describe('runActivityEnrichmentPipeline zone times', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('runs zone-times detail enrich after map pass when api key is set', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'i555',
                icu_zone_times: [{ id: 'Z2', secs: 1800 }],
                icu_ftp: 260,
            }),
        });

        const activities = [{ id: 'i555', date: '2026-08-10', avg_power: 190, ftp: 260 }];

        const { activities: out, stats } = await runActivityEnrichmentPipeline(activities, {
            intervalsConfig: { apiKey: 'key', athleteId: 'a1' },
            deferDriftEnrich: true,
            zoneTimesMaxFetches: 5,
            zoneTimesDelayMs: 0,
        });

        expect(stats.zoneTimesEnriched).toBe(1);
        expect(out[0].power_zone_sec).toEqual([0, 1800, 0, 0, 0, 0, 0]);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('skips network enrichment in fast mode', async () => {
        const activities = [{ id: 'i555', date: '2026-08-10', avg_power: 190, ftp: 260 }];

        const { stats } = await runActivityEnrichmentPipeline(activities, {
            intervalsConfig: { apiKey: 'key', athleteId: 'a1' },
            enrichmentMode: 'fast',
        });

        expect(stats.zoneTimesEnriched).toBe(0);
        expect(stats.powerCurveRan).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });
});
