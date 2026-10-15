import { describe, it, expect } from 'vitest';
import {
    activityHasRoutePolyline,
    getActivityRoutePolylineSource,
    summarizeActivityRouteMapCoverage,
    formatRouteMapCoverageSummary,
} from '../../utils/activityRouteMapCoverage.js';

describe('activityRouteMapCoverage', () => {
    it('prefers strava_map when both are set', () => {
        expect(getActivityRoutePolylineSource({
            id: '1',
            strava_map: 'abc',
            intervals_map: 'xyz',
        })).toBe('strava');
        expect(activityHasRoutePolyline({ id: '1', intervals_map: 'xyz' })).toBe(true);
    });

    it('counts missing and sources in summary', () => {
        const summary = summarizeActivityRouteMapCoverage([
            { id: 'a', strava_map: 'poly' },
            { id: 'b', intervals_map: 'poly2' },
            { id: 'c', title: 'No map' },
            { id: 'd', strava_map: '   ' },
        ]);
        expect(summary.total).toBe(4);
        expect(summary.withStravaMap).toBe(1);
        expect(summary.withIntervalsMap).toBe(1);
        expect(summary.withRouteMap).toBe(2);
        expect(summary.missingRouteMap).toBe(2);
        expect(summary.missingActivities.map((a) => a.id)).toEqual(['c', 'd']);
    });

    it('formats a readable summary line', () => {
        const text = formatRouteMapCoverageSummary({
            total: 10,
            withRouteMap: 7,
            withStravaMap: 5,
            withIntervalsMap: 2,
            missingRouteMap: 3,
            missingActivities: [],
        });
        expect(text).toContain('7/10 (70%)');
        expect(text).toContain('missing both: 3');
    });
});
