import { describe, it, expect } from 'vitest';
import { linkIntervalsActivitiesToStravaList, applyStravaFuzzyMatchesToIntervals } from '../../utils/stravaLinkIntervalsFetch.js';

describe('stravaLinkIntervalsFetch', () => {
    it('linkIntervalsActivitiesToStravaList adds strava_id when start times align', () => {
        const intervals = [
            { id: 'i1', date: '2026-05-01T10:00:00', title: 'Ride A', type: 'Ride', distance: 50 },
            { id: 'i2', date: '2026-05-02T08:00:00', strava_id: '999', title: 'Already' },
        ];
        const strava = [
            { id: 111, start_date_local: '2026-05-01T10:02:00', name: 'Strava A', gear_id: 'b1', sport_type: 'Ride', distance: 50100 },
            { id: 222, start_date_local: '2026-05-03T08:00:00', name: 'Other' },
        ];
        const out = linkIntervalsActivitiesToStravaList(intervals, strava);
        expect(out[0].strava_id).toBe('111');
        expect(out[0].gear_id).toBe('b1');
        expect(out[0].title).toBe('Strava A');
        expect(out[1].strava_id).toBe('999');
    });

    it('chooses the closest compatible ride instead of the first Strava item in the time window', () => {
        const intervals = [
            { id: 'i1', date: '2026-05-01T10:00:00', title: 'Ride A', type: 'Ride', distance: 50 },
        ];
        const strava = [
            { id: 111, start_date_local: '2026-05-01T10:01:00', name: 'Nearby Run', sport_type: 'Run', distance: 10000 },
            { id: 222, start_date_local: '2026-05-01T10:03:00', name: 'Correct Ride', sport_type: 'Ride', distance: 50000 },
        ];

        const out = linkIntervalsActivitiesToStravaList(intervals, strava);

        expect(out[0].strava_id).toBe('222');
        expect(out[0].title).toBe('Correct Ride');
    });

    it('does not link a ride to a nearby Strava activity with a very different distance', () => {
        const intervals = [
            { id: 'i1', date: '2026-05-01T10:00:00', title: 'Ride A', type: 'Ride', distance: 50 },
        ];
        const strava = [
            { id: 111, start_date_local: '2026-05-01T10:02:00', name: 'Different Ride', sport_type: 'Ride', distance: 10000 },
        ];

        const out = linkIntervalsActivitiesToStravaList(intervals, strava);

        expect(out[0].strava_id).toBeUndefined();
        expect(out[0].title).toBe('Ride A');
    });

    it('applyStravaFuzzyMatchesToIntervals links same-day ride by distance/duration', () => {
        const intervals = [
            { id: 'i1', date: '2026-05-01T10:00:00', distance: 50.1, moving_time: 7200, type: 'Ride' },
        ];
        const strava = [
            {
                id: 999,
                start_date_local: '2026-05-01T10:25:00',
                distance: 50100,
                moving_time: 7210,
                sport_type: 'Ride',
                name: 'Outdoor',
                gear_id: 'g1',
            },
        ];
        applyStravaFuzzyMatchesToIntervals(intervals, strava);
        expect(intervals[0].strava_id).toBe('999');
        expect(intervals[0].gear_id).toBe('g1');
    });

    it('does not overwrite existing strava_id', () => {
        const intervals = [{ id: 'i1', date: '2026-05-01T10:00:00', strava_id: '55' }];
        const strava = [{ id: 111, start_date_local: '2026-05-01T10:01:00', name: 'X' }];
        const out = linkIntervalsActivitiesToStravaList(intervals, strava);
        expect(out[0].strava_id).toBe('55');
    });
});
