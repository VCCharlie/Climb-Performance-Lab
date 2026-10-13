import { describe, it, expect, vi } from 'vitest';
import {
    buildIntervalsBasicAuthHeader,
    computeRetryDelayMs,
    isRetryableCloudHttpStatus,
    summarizeHttpErrorBody,
    parseCloudSyncActivitiesPayload,
    transformIntervalsListForNightly,
    fetchIntervalsActivitiesViaCloudWithRetry,
    fetchNightlyIntervalsActivitiesResilient,
} from '../../utils/nightlySyncIntervalsFetch';

describe('nightlySyncIntervalsFetch helpers', () => {
    it('buildIntervalsBasicAuthHeader matches API_KEY basic scheme', () => {
        const header = buildIntervalsBasicAuthHeader('secret-key');
        expect(header.startsWith('Basic ')).toBe(true);
        const decoded = Buffer.from(header.replace('Basic ', ''), 'base64').toString('utf8');
        expect(decoded).toBe('API_KEY:secret-key');
    });

    it('isRetryableCloudHttpStatus covers transient codes', () => {
        expect(isRetryableCloudHttpStatus(500)).toBe(true);
        expect(isRetryableCloudHttpStatus(503)).toBe(true);
        expect(isRetryableCloudHttpStatus(401)).toBe(false);
    });

    it('summarizeHttpErrorBody shortens HTML error pages', () => {
        const html = '<!DOCTYPE html><html><body>Service Unavailable</body></html>';
        expect(summarizeHttpErrorBody(html)).toBe('HTML error page (upstream unavailable)');
    });

    it('computeRetryDelayMs exponential backoff', () => {
        expect(computeRetryDelayMs(1, 1000)).toBe(1000);
        expect(computeRetryDelayMs(2, 1000)).toBe(2000);
        expect(computeRetryDelayMs(3, 1000)).toBe(4000);
    });

    it('parseCloudSyncActivitiesPayload accepts array or wrapped activities', () => {
        expect(parseCloudSyncActivitiesPayload([{ id: 1 }])).toHaveLength(1);
        expect(parseCloudSyncActivitiesPayload({ activities: [{ id: 2 }] })).toHaveLength(1);
        expect(() => parseCloudSyncActivitiesPayload({ error: 'nope' })).toThrow(/Unexpected cloud sync/);
    });
});

describe('transformIntervalsListForNightly', () => {
    it('filters sport types and empty rows', () => {
        const raw = [
            {
                id: 'i1',
                start_date_local: '2026-01-01T10:00:00',
                type: 'Run',
                distance: 5000,
                moving_time: 3600,
            },
            {
                id: 'i2',
                start_date_local: '2026-01-02T10:00:00',
                type: 'Ride',
                distance: 40000,
                moving_time: 5400,
                icu_average_watts: 180,
            },
        ];
        const out = transformIntervalsListForNightly(raw, ['Ride']);
        expect(out).toHaveLength(1);
        expect(out[0].type).toBe('Ride');
    });
});

describe('fetchIntervalsActivitiesViaCloudWithRetry', () => {
    it('retries on 503 then succeeds', async () => {
        vi.useFakeTimers();

        const fetchFn = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: async () => 'unavailable',
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => [{ id: 'i99', type: 'Ride', distance: 10, moving_time: 100, avg_power: 200 }],
            });

        const promise = fetchIntervalsActivitiesViaCloudWithRetry({
            athleteId: 'i1',
            apiKey: 'key',
            startDate: '2026-01-01',
            endDate: '2026-01-14',
            sportTypes: ['Ride'],
            fetchFn,
            retryBaseDelayMs: 10,
        });

        await vi.runAllTimersAsync();
        const result = await promise;

        expect(fetchFn).toHaveBeenCalledTimes(2);
        expect(result.attempts).toBe(2);
        expect(result.activities).toHaveLength(1);

        vi.useRealTimers();
    });
});

describe('fetchNightlyIntervalsActivitiesResilient', () => {
    it('uses direct fallback when cloud keeps failing', async () => {
        const directRaw = [{
            id: 'i53534754',
            start_date_local: '2026-01-06T08:00:00',
            type: 'Ride',
            distance: 45000,
            moving_time: 5400,
            icu_average_watts: 190,
        }];

        const fetchFn = vi.fn(async (url, init) => {
            if (init?.method === 'POST') {
                return {
                    ok: false,
                    status: 500,
                    text: async () => '<!DOCTYPE html><html>error</html>',
                };
            }
            return {
                ok: true,
                status: 200,
                json: async () => directRaw,
            };
        });

        const { activities, meta } = await fetchNightlyIntervalsActivitiesResilient({
            athleteId: 'i34047',
            apiKey: 'test-key',
            startDate: '2026-01-01',
            endDate: '2026-01-14',
            sportTypes: ['Ride'],
            fetchFn,
            cloudRetryAttempts: 1,
        });

        expect(meta.route).toBe('direct_fallback');
        expect(meta.cloudError).toMatch(/Cloud function returned 500/);
        expect(activities.length).toBeGreaterThan(0);
        expect(activities[0].id).toBeTruthy();
    });
});
