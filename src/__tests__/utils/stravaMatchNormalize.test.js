import { describe, it, expect } from 'vitest';
import { normalizeStravaActivity } from '../../utils/stravaMatch.js';

const baseAct = {
    id: 12345678,
    name: 'Col climb',
    start_date_local: '2026-07-01T08:00:00Z',
    sport_type: 'Ride',
    distance: 50000,
    average_speed: 5,
    average_watts: 200,
    weighted_average_watts: 210,
    moving_time: 3600,
};

describe('normalizeStravaActivity elevation', () => {
    it('marks climbing_from_strava when total_elevation_gain is present', () => {
        const out = normalizeStravaActivity({
            ...baseAct,
            total_elevation_gain: 1234.4,
        });
        expect(out.climbing).toBe(1234);
        expect(out.climbing_from_strava).toBe(true);
    });

    it('does not mark climbing_from_strava when elevation is missing', () => {
        const out = normalizeStravaActivity({ ...baseAct });
        expect(out.climbing).toBe(0);
        expect(out.climbing_from_strava).toBeUndefined();
    });

    it('marks authentic flat rides with elevation 0 as from Strava', () => {
        const out = normalizeStravaActivity({
            ...baseAct,
            total_elevation_gain: 0,
        });
        expect(out.climbing).toBe(0);
        expect(out.climbing_from_strava).toBe(true);
    });

    it('preserves start_date_local datetime on normalized activity', () => {
        const out = normalizeStravaActivity({ ...baseAct });
        expect(out.date).toBe('2026-07-01T08:00:00Z');
    });
});
