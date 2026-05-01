import { describe, it, expect } from 'vitest';
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
