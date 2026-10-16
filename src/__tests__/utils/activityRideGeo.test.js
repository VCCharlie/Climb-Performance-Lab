import { describe, it, expect } from 'vitest';
import { centroidFromEncodedPolyline } from '../../utils/activityRideGeo.js';
import { encodeGooglePolyline } from '../../utils/intervalsMapFetch.js';

describe('activityRideGeo', () => {
    it('computes centroid from encoded polyline', () => {
        const encoded = encodeGooglePolyline([
            [52.0, 4.0],
            [52.02, 4.02],
        ]);
        const c = centroidFromEncodedPolyline(encoded);
        expect(c).not.toBeNull();
        expect(c.lat).toBeCloseTo(52.01, 2);
        expect(c.lon).toBeCloseTo(4.01, 2);
    });
});
