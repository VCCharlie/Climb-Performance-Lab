import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    parseActivityUrl,
    normalizeIntervalsUrlActivityIdForApi,
    buildIntervalsApiActivityIdCandidates,
    isSubstantiveIntervalsApiPayload,
    intervalsActivityIdsEquivalent,
} from '../../utils/manualActivityImport';

describe('buildIntervalsApiActivityIdCandidates', () => {
    it('prefers i-prefixed id for bare numeric URL ids', () => {
        expect(buildIntervalsApiActivityIdCandidates('970385547')).toEqual(['i970385547', '970385547']);
    });

    it('preserves i-prefixed Intervals activity ids and adds bare numeric fallback', () => {
        expect(buildIntervalsApiActivityIdCandidates('i53534754')).toEqual(['i53534754', '53534754']);
        expect(buildIntervalsApiActivityIdCandidates('I999')).toEqual(['i999', '999']);
    });
});

describe('normalizeIntervalsUrlActivityIdForApi', () => {
    it('returns the first API candidate', () => {
        expect(normalizeIntervalsUrlActivityIdForApi('970385547')).toBe('i970385547');
        expect(normalizeIntervalsUrlActivityIdForApi('i53534754')).toBe('i53534754');
    });
});

describe('isSubstantiveIntervalsApiPayload', () => {
    it('detects sparse vs substantive Intervals payloads', () => {
        expect(isSubstantiveIntervalsApiPayload({
            start_date_local: '2017-05-04T08:00:00',
            name: 'Untitled',
            moving_time: 0,
            distance: 0,
        })).toBe(false);
        expect(isSubstantiveIntervalsApiPayload({
            id: 'i970385547',
            name: 'Cols ride',
            moving_time: 7200,
            icu_average_watts: 180,
        })).toBe(true);
    });
});

describe('intervalsActivityIdsEquivalent', () => {
    it('matches i-prefixed and bare numeric ids', () => {
        expect(intervalsActivityIdsEquivalent('970385547', 'i970385547')).toBe(true);
        expect(intervalsActivityIdsEquivalent('i123', '456')).toBe(false);
    });
});

describe('parseActivityUrl', () => {
    it('parses Strava activity URLs', () => {
        expect(parseActivityUrl('https://www.strava.com/activities/12345')).toEqual({ kind: 'strava', id: '12345' });
        expect(parseActivityUrl('http://strava.com/activity/999')).toEqual({ kind: 'strava', id: '999' });
    });

    it('parses Intervals activity URLs', () => {
        expect(parseActivityUrl('https://intervals.icu/activities/87654321')).toEqual({ kind: 'intervals', id: '87654321' });
        expect(parseActivityUrl('https://intervals.icu/i12345/activities/111')).toEqual({ kind: 'intervals', id: '111' });
        expect(parseActivityUrl('https://intervals.icu/activities/i53534754')).toEqual({ kind: 'intervals', id: 'i53534754' });
    });

    it('returns null for unrelated URLs', () => {
        expect(parseActivityUrl('https://example.com/foo')).toBeNull();
    });
});

describe('fetchMergedActivityFromPrimaryAndOptionalUrl', () => {
    it('rejects two Strava URLs', async () => {
        const { fetchMergedActivityFromPrimaryAndOptionalUrl } = await import('../../utils/manualActivityImport');
        await expect(
            fetchMergedActivityFromPrimaryAndOptionalUrl(
                'https://www.strava.com/activities/1',
                'https://www.strava.com/activities/2',
                {},
            ),
        ).rejects.toThrow(/different services/i);
    });
});

describe('fetchSingleActivityFromUrl — Intervals URL id resolution', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses i-prefixed API id for bare numeric Intervals URLs', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: 'i970385547',
                start_date_local: '2017-05-04T08:00:00',
                name: 'Cols 2017',
                type: 'Ride',
                moving_time: 7200,
                distance: 85000,
                icu_average_watts: 180,
                icu_weighted_avg_watts: 195,
                icu_training_load: 85,
                Best20minpower: 220,
            }),
        });

        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        const act = await fetchSingleActivityFromUrl(
            'https://intervals.icu/activities/970385547',
            { intervalsConfig: { apiKey: 'secret-key', athleteId: 'i12345' } },
        );

        expect(fetch).toHaveBeenCalledWith(
            'https://intervals.icu/api/v1/activity/i970385547',
            expect.any(Object),
        );
        expect(act.title).toBe('Cols 2017');
        expect(act.best_20min).toBe(220);
        expect(act.avg_power).toBe(180);
    });

    it('merges Strava metrics when Intervals API returns sparse STRAVA-sourced payload', async () => {
        fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'i970385547',
                    start_date_local: '2017-05-04T08:00:00',
                    source: 'STRAVA',
                    external_id: 'strava:99112233',
                    name: 'Untitled',
                    moving_time: 0,
                    distance: 0,
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 99112233,
                    name: 'Cols 2017',
                    type: 'Ride',
                    distance: 85000,
                    moving_time: 7200,
                    average_watts: 180,
                    weighted_average_watts: 195,
                }),
            });

        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        const act = await fetchSingleActivityFromUrl(
            'https://intervals.icu/activities/970385547',
            {
                intervalsConfig: { apiKey: 'secret-key', athleteId: 'i12345' },
                stravaToken: 'oauth-token',
            },
        );

        expect(act.id).toBe('i970385547');
        expect(act.title).toBe('Cols 2017');
        expect(act.distance).toBe(85);
        expect(act.avg_power).toBe(180);
        expect(act.strava_id).toBe('99112233');
    });

    it('throws helpful message when Intervals is Strava-restricted and Strava is not connected', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: 'i970385547',
                start_date_local: '2017-05-04T08:00:00',
                name: 'Untitled',
                moving_time: 0,
                distance: 0,
            }),
        });

        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        await expect(
            fetchSingleActivityFromUrl(
                'https://intervals.icu/activities/970385547',
                { intervalsConfig: { apiKey: 'secret-key', athleteId: 'i12345' } },
            ),
        ).rejects.toThrow(/Connect Strava in Settings/i);
    });
});

describe('fetchSingleActivityFromUrl — Strava token resolution', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves token via stravaGetToken for a single Strava URL', async () => {
        const stravaGetToken = vi.fn().mockResolvedValue('oauth-token-abc');
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 12345,
                name: 'Morning Ride',
                type: 'Ride',
                distance: 42000,
                moving_time: 5400,
                average_speed: 7.8,
            }),
        });

        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        const act = await fetchSingleActivityFromUrl(
            'https://www.strava.com/activities/12345',
            { stravaGetToken },
        );

        expect(stravaGetToken).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/activities/12345'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer oauth-token-abc',
                }),
            }),
        );
        expect(act.strava_id).toBe('12345');
        expect(act.title).toBe('Morning Ride');
    });

    it('throws session-expired when stravaGetToken fails', async () => {
        const stravaGetToken = vi.fn().mockRejectedValue(new Error('refresh failed'));

        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        await expect(
            fetchSingleActivityFromUrl(
                'https://www.strava.com/activities/12345',
                { stravaGetToken },
            ),
        ).rejects.toThrow(/Strava session expired — reconnect in Settings/i);
    });

    it('throws connect Strava when neither token nor getToken is provided', async () => {
        const { fetchSingleActivityFromUrl } = await import('../../utils/manualActivityImport');
        await expect(
            fetchSingleActivityFromUrl('https://www.strava.com/activities/12345', {}),
        ).rejects.toThrow(/Connect Strava \(Settings\)/i);
    });
});
