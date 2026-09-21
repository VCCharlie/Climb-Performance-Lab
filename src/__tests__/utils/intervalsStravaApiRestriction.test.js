import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    isStravaRestrictedIntervalsApiPayload,
    buildStravaRestrictedIntervalsMessage,
    siteActivityNeedsStravaMetricBackfill,
    mergeStravaApiIntoRestrictedIntervalsActivity,
    backfillStravaMetricsForSparseIntervalsActivities,
} from '../../utils/intervalsStravaApiRestriction';

describe('isStravaRestrictedIntervalsApiPayload', () => {
    it('detects explicit STRAVA source', () => {
        expect(isStravaRestrictedIntervalsApiPayload({
            id: 'i970385547',
            source: 'STRAVA',
            start_date_local: '2017-05-04T08:00:00',
        })).toBe(true);
    });

    it('detects sparse i-prefixed Intervals ids without metrics', () => {
        expect(isStravaRestrictedIntervalsApiPayload({
            id: 'i970385547',
            start_date_local: '2017-05-04T08:00:00',
            name: 'Untitled',
            moving_time: 0,
            distance: 0,
        })).toBe(true);
    });

    it('does not flag substantive Intervals payloads', () => {
        expect(isStravaRestrictedIntervalsApiPayload({
            id: 'i970385547',
            name: 'Cols ride',
            moving_time: 7200,
            icu_average_watts: 180,
        })).toBe(false);
    });
});

describe('buildStravaRestrictedIntervalsMessage', () => {
    it('mentions Strava URL when connected', () => {
        const msg = buildStravaRestrictedIntervalsMessage({
            hasStravaConnection: true,
            dateYmd: '2017-05-04',
        });
        expect(msg).toMatch(/Strava activity URL/i);
        expect(msg).toMatch(/2017-05-04/);
    });
});

describe('siteActivityNeedsStravaMetricBackfill', () => {
    it('needs backfill for sparse Intervals rows', () => {
        expect(siteActivityNeedsStravaMetricBackfill({
            id: 'i970385547',
            date: '2017-05-04',
            title: 'Untitled',
            moving_time: 0,
            distance: 0,
        })).toBe(true);
    });

    it('skips rows that already have metrics', () => {
        expect(siteActivityNeedsStravaMetricBackfill({
            id: 'i123',
            distance: 42,
            moving_time: 3600,
        })).toBe(false);
    });
});

describe('mergeStravaApiIntoRestrictedIntervalsActivity', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('merges Strava detail onto sparse Intervals payload', async () => {
        fetch.mockImplementation(async (url) => {
            const u = String(url);
            if (u.includes('power-curve')) {
                return { ok: false, status: 404, json: async () => ({}) };
            }
            if (u.includes('/streams?')) {
                return {
                    ok: true,
                    json: async () => ({
                        time: { data: Array.from({ length: 120 }, (_, i) => i) },
                        watts: { data: Array.from({ length: 120 }, (_, i) => (i >= 30 && i < 90 ? 420 : 180)) },
                    }),
                };
            }
            return {
                ok: true,
                json: async () => ({
                    id: 99112233,
                    name: 'Cols 2017',
                    type: 'Ride',
                    distance: 85000,
                    moving_time: 7200,
                    average_watts: 180,
                    weighted_average_watts: 195,
                    average_heartrate: 145,
                }),
            };
        });

        const merged = await mergeStravaApiIntoRestrictedIntervalsActivity(
            {
                id: 'i970385547',
                start_date_local: '2017-05-04T08:00:00',
                source: 'STRAVA',
                external_id: 'strava:99112233',
            },
            { stravaToken: 'token-abc', intervalsConfig: { apiKey: 'secret' } },
        );

        expect(merged.id).toBe('i970385547');
        expect(merged.title).toBe('Cols 2017');
        expect(merged.distance).toBe(85);
        expect(merged.avg_power).toBe(180);
        expect(merged.strava_id).toBe('99112233');
        expect(merged.best_1min).toBeGreaterThanOrEqual(400);
    });
});

describe('backfillStravaMetricsForSparseIntervalsActivities', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns original list when no Strava token', async () => {
        const sparse = [{ id: 'i970385547', date: '2017-05-04', distance: 0 }];
        const out = await backfillStravaMetricsForSparseIntervalsActivities(sparse, {});
        expect(out).toEqual(sparse);
        expect(fetch).not.toHaveBeenCalled();
    });
});
