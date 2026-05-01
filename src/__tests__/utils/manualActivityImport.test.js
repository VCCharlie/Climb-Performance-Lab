import { describe, it, expect } from 'vitest';
import { parseActivityUrl } from '../../utils/manualActivityImport';

describe('parseActivityUrl', () => {
    it('parses Strava activity URLs', () => {
        expect(parseActivityUrl('https://www.strava.com/activities/12345')).toEqual({ kind: 'strava', id: '12345' });
        expect(parseActivityUrl('http://strava.com/activity/999')).toEqual({ kind: 'strava', id: '999' });
    });

    it('parses Intervals activity URLs', () => {
        expect(parseActivityUrl('https://intervals.icu/activities/87654321')).toEqual({ kind: 'intervals', id: '87654321' });
        expect(parseActivityUrl('https://intervals.icu/i12345/activities/111')).toEqual({ kind: 'intervals', id: '111' });
    });

    it('returns null for unrelated URLs', () => {
        expect(parseActivityUrl('https://example.com/foo')).toBeNull();
    });
});
