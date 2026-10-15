import { describe, it, expect } from 'vitest';
import {
    buildProfilePointsFromEncodedPolyline,
    resolveActivityRouteProfile,
    describeActivityProfilerRouteTooltip,
} from '../../utils/activityRouteProfiler.js';
import { encodeGooglePolyline } from '../../utils/intervalsMapFetch.js';

describe('activityRouteProfiler', () => {
    it('builds distance/elevation profile from encoded polyline', () => {
        const encoded = encodeGooglePolyline([
            [52.0, 5.0],
            [52.01, 5.01],
            [52.02, 5.02],
        ]);
        const points = buildProfilePointsFromEncodedPolyline(encoded, { climbingM: 100 });
        expect(points).not.toBeNull();
        expect(points.length).toBeGreaterThanOrEqual(2);
        expect(points[points.length - 1].elevation).toBeCloseTo(100, 0);
        expect(points[points.length - 1].distance).toBeGreaterThan(0);
    });

    it('resolves intervals_map when strava_map is missing', () => {
        const encoded = encodeGooglePolyline([[52.0, 5.0], [52.01, 5.01]]);
        const profile = resolveActivityRouteProfile({
            id: 'i1',
            intervals_map: encoded,
            climbing: 50,
        });
        expect(profile?.source).toBe('intervals');
        expect(profile?.points?.length).toBeGreaterThanOrEqual(2);
    });

    it('tooltip mentions Intervals when only intervals_map is set', () => {
        const tip = describeActivityProfilerRouteTooltip({ intervals_map: 'abc' }, false);
        expect(tip).toContain('Intervals.icu');
    });
});
