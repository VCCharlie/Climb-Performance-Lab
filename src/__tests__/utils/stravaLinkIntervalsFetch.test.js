import { describe, it, expect } from 'vitest';
import { linkIntervalsActivitiesToStravaList } from '../../utils/stravaLinkIntervalsFetch.js';

describe('stravaLinkIntervalsFetch', () => {
    it('linkIntervalsActivitiesToStravaList adds strava_id when start times align', () => {
        const intervals = [
            { id: 'i1', date: '2026-05-01T10:00:00', title: 'Ride A' },
            { id: 'i2', date: '2026-05-02T08:00:00', strava_id: '999', title: 'Already' },
        ];
        const strava = [
            { id: 111, start_date_local: '2026-05-01T10:02:00', name: 'Strava A', gear_id: 'b1' },
            { id: 222, start_date_local: '2026-05-03T08:00:00', name: 'Other' },
        ];
        const out = linkIntervalsActivitiesToStravaList(intervals, strava);
        expect(out[0].strava_id).toBe('111');
        expect(out[0].gear_id).toBe('b1');
        expect(out[0].title).toBe('Strava A');
        expect(out[1].strava_id).toBe('999');
    });

    it('does not overwrite existing strava_id', () => {
        const intervals = [{ id: 'i1', date: '2026-05-01T10:00:00', strava_id: '55' }];
        const strava = [{ id: 111, start_date_local: '2026-05-01T10:01:00', name: 'X' }];
        const out = linkIntervalsActivitiesToStravaList(intervals, strava);
        expect(out[0].strava_id).toBe('55');
    });
});
