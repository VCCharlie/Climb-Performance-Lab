/**
 * Tests for src/utils/stravaProfileLightFetch.js
 */
import { describe, it, expect } from 'vitest';
import { mergeStravaProfileStatsOnly } from '../../utils/stravaProfileLightFetch';

describe('mergeStravaProfileStatsOnly', () => {
    it('preserves KOMs, scan, and vsLogUi when updating stats', () => {
        const prev = {
            koms: [{ id: 1 }],
            starred: [{ id: 2 }],
            activityScan: { ridesScanned: 50 },
            recordRides: { historyComplete: true },
            vsLogUi: { startYmd: '2026-01-01' },
            stats: { all_ride_totals: { count: 1 } },
        };
        const nextStats = {
            all_ride_totals: { count: 2, distance: 100000 },
            ytd_ride_totals: { count: 1, distance: 50000 },
        };
        const merged = mergeStravaProfileStatsOnly(prev, {
            stats: nextStats,
            fetchedAt: '2026-08-17T10:00:00.000Z',
        });
        expect(merged.stats).toEqual(nextStats);
        expect(merged.koms).toEqual(prev.koms);
        expect(merged.activityScan).toEqual(prev.activityScan);
        expect(merged.vsLogUi).toEqual(prev.vsLogUi);
        expect(merged.statsFetchedAt).toBe('2026-08-17T10:00:00.000Z');
    });

    it('updates bikes from athlete payload when present', () => {
        const merged = mergeStravaProfileStatsOnly(
            { bikes: [{ id: 'a', distance: 1 }] },
            {
                athlete: { bikes: [{ id: 'b', distance: 5000 }, { id: 'a', distance: 100 }] },
                stats: { all_ride_totals: { count: 1 } },
            },
        );
        expect(merged.bikes[0].id).toBe('b');
        expect(merged.bikes[1].id).toBe('a');
    });
});
