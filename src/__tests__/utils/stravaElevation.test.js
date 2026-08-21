import { describe, it, expect } from 'vitest';
import {
    climbingMetersFromStrava,
    climbingPatchFromStravaActivity,
    applyStravaElevationToActivity,
} from '../../utils/stravaElevation.js';

describe('stravaElevation', () => {
    it('rounds valid Strava total_elevation_gain', () => {
        expect(climbingMetersFromStrava(1234.6)).toBe(1235);
        expect(climbingMetersFromStrava(0)).toBe(0);
    });

    it('returns null for invalid values', () => {
        expect(climbingMetersFromStrava(null)).toBeNull();
        expect(climbingMetersFromStrava(-1)).toBeNull();
    });

    it('builds climbing patch with source flag', () => {
        expect(climbingPatchFromStravaActivity({ total_elevation_gain: 890 })).toEqual({
            climbing: 890,
            climbing_from_strava: true,
        });
    });

    it('applyStravaElevationToActivity merges patch', () => {
        const out = applyStravaElevationToActivity(
            { id: '1', climbing: 500 },
            { total_elevation_gain: 812 },
        );
        expect(out.climbing).toBe(812);
        expect(out.climbing_from_strava).toBe(true);
    });

    it('skips elevation when climbing was manually corrected', () => {
        const out = applyStravaElevationToActivity(
            { id: '1', climbing: 920, climbing_user_corrected: true },
            { total_elevation_gain: 812 },
        );
        expect(out.climbing).toBe(920);
        expect(out.climbing_user_corrected).toBe(true);
    });

    it('force refresh clears manual correction flag', () => {
        const out = applyStravaElevationToActivity(
            { id: '1', climbing: 920, climbing_user_corrected: true },
            { total_elevation_gain: 812 },
            { forceRefreshElevation: true },
        );
        expect(out.climbing).toBe(812);
        expect(out.climbing_from_strava).toBe(true);
        expect(out.climbing_user_corrected).toBeUndefined();
    });
});
