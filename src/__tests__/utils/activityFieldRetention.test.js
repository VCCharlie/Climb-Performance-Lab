import { describe, it, expect } from 'vitest';
import {
    applyManualClimbingCorrectionFlags,
    climbingWasManuallyEdited,
    hasProtectedClimbing,
    shouldApplyStravaElevationPatch,
} from '../../utils/activityFieldRetention';

describe('activityFieldRetention', () => {
    it('detects manual climbing edits', () => {
        expect(climbingWasManuallyEdited({ climbing: 800 }, { climbing: 920 })).toBe(true);
        expect(climbingWasManuallyEdited({ climbing: 800 }, { climbing: 800 })).toBe(false);
    });

    it('marks manual climbing corrections', () => {
        const out = applyManualClimbingCorrectionFlags(
            { id: '1', climbing: 800 },
            { id: '1', climbing: 920 },
        );
        expect(out.climbing_user_corrected).toBe(true);
    });

    it('treats Strava and manual climbing as protected', () => {
        expect(hasProtectedClimbing({ climbing_from_strava: true })).toBe(true);
        expect(hasProtectedClimbing({ climbing_user_corrected: true })).toBe(true);
        expect(hasProtectedClimbing({ climbing: 500 })).toBe(false);
    });

    it('skips Strava elevation when climbing is protected unless forced', () => {
        const act = { climbing: 900, climbing_user_corrected: true };
        expect(shouldApplyStravaElevationPatch(act)).toBe(false);
        expect(shouldApplyStravaElevationPatch(act, { forceRefreshElevation: true })).toBe(true);
    });
});
