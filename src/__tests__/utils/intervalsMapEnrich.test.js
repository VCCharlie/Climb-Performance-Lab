import { describe, it, expect } from 'vitest';
import {
    activityNeedsIntervalsMapPolyline,
    filterActivitiesForIntervalsMapBackfill,
    isIntervalsActivityId,
} from '../../utils/intervalsMapEnrich.js';

describe('intervalsMapEnrich eligibility', () => {
    it('skips rides that already have a route map', () => {
        expect(activityNeedsIntervalsMapPolyline({ id: '1', strava_map: 'poly' })).toBe(false);
        expect(activityNeedsIntervalsMapPolyline({ id: '2', intervals_map: 'poly' })).toBe(false);
    });

    it('includes virtual and indoor rides when maps are missing', () => {
        expect(activityNeedsIntervalsMapPolyline({ id: 'v', type: 'VirtualRide', title: 'Zwift' })).toBe(true);
        expect(activityNeedsIntervalsMapPolyline({ id: 't', type: 'Ride', trainer: true })).toBe(true);
    });

    it('includes outdoor rides missing both maps', () => {
        expect(activityNeedsIntervalsMapPolyline({ id: 'o', type: 'Ride', title: 'Sunday club ride' })).toBe(true);
        expect(activityNeedsIntervalsMapPolyline({ id: 'g', type: 'GravelRide', title: 'Forest loop' })).toBe(true);
    });

    it('filterActivitiesForIntervalsMapBackfill returns only eligible rows', () => {
        const list = [
            { id: 'a', type: 'Ride', title: 'Road' },
            { id: 'b', type: 'VirtualRide' },
            { id: 'c', type: 'Ride', strava_map: 'x' },
        ];
        expect(filterActivitiesForIntervalsMapBackfill(list).map((a) => a.id)).toEqual(['a', 'b']);
    });

    it('detects Intervals activity ids', () => {
        expect(isIntervalsActivityId('i197621495')).toBe(true);
        expect(isIntervalsActivityId('garmin-123')).toBe(false);
    });
});
