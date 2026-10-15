import { describe, it, expect } from 'vitest';
import {
    filterActivitiesForIntervalsMapBackfill,
    isEligibleForIntervalsMapBackfill,
} from '../../utils/intervalsMapEnrich.js';

describe('intervalsMapEnrich eligibility', () => {
    it('skips rides that already have a route map', () => {
        expect(isEligibleForIntervalsMapBackfill({ id: '1', strava_map: 'poly' })).toBe(false);
        expect(isEligibleForIntervalsMapBackfill({ id: '2', intervals_map: 'poly' })).toBe(false);
    });

    it('skips indoor and virtual rides', () => {
        expect(isEligibleForIntervalsMapBackfill({ id: 'v', type: 'VirtualRide', title: 'Zwift' })).toBe(false);
        expect(isEligibleForIntervalsMapBackfill({ id: 't', type: 'Ride', trainer: true })).toBe(false);
        expect(isEligibleForIntervalsMapBackfill({ id: 'z', type: 'Ride', title: 'Zwift - Volcano' })).toBe(false);
    });

    it('includes outdoor rides missing both maps', () => {
        expect(isEligibleForIntervalsMapBackfill({ id: 'o', type: 'Ride', title: 'Sunday club ride' })).toBe(true);
        expect(isEligibleForIntervalsMapBackfill({ id: 'g', type: 'GravelRide', title: 'Forest loop' })).toBe(true);
    });

    it('filterActivitiesForIntervalsMapBackfill returns only eligible rows', () => {
        const list = [
            { id: 'a', type: 'Ride', title: 'Road' },
            { id: 'b', type: 'VirtualRide' },
            { id: 'c', type: 'Ride', strava_map: 'x' },
        ];
        expect(filterActivitiesForIntervalsMapBackfill(list).map((a) => a.id)).toEqual(['a']);
    });
});
