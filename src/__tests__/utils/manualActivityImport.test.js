import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseActivityUrl, normalizeIntervalsUrlActivityIdForApi } from '../../utils/manualActivityImport';

describe('normalizeIntervalsUrlActivityIdForApi', () => {
    it('preserves i-prefixed Intervals activity ids for the REST API', () => {
        expect(normalizeIntervalsUrlActivityIdForApi('i53534754')).toBe('i53534754');
        expect(normalizeIntervalsUrlActivityIdForApi('I999')).toBe('i999');
    });

    it('accepts plain numeric ids', () => {
        expect(normalizeIntervalsUrlActivityIdForApi('87654321')).toBe('87654321');
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
