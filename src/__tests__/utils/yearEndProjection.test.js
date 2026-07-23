import { describe, it, expect } from 'vitest';
import { projectYearEndVolume, projectionVsTargetStatus } from '../../utils/yearEndProjection';

describe('yearEndProjection', () => {
    it('projects linear year-end totals from YTD', () => {
        const yearRange = { startYmd: '2026-01-01', endYmd: '2026-12-31' };
        const ref = new Date(2026, 6, 1); // ~50% through year (Jul 1)
        const currentYtd = { distanceKm: 500, movingTimeSec: 36000, elevationM: 10000 };

        const proj = projectYearEndVolume(currentYtd, yearRange, ref);
        expect(proj).not.toBeNull();
        expect(proj.distanceKm).toBeGreaterThan(900);
        expect(proj.movingTimeHours).toBeGreaterThan(15);
    });

    it('returns null when year just started with no volume', () => {
        const yearRange = { startYmd: '2026-01-01', endYmd: '2026-12-31' };
        const ref = new Date(2026, 0, 2);
        expect(projectYearEndVolume({ distanceKm: 0, movingTimeSec: 0, elevationM: 0 }, yearRange, ref)).toBeNull();
    });

    it('projectionVsTargetStatus compares projected to goal', () => {
        expect(projectionVsTargetStatus(1100, 1000)).toBe('above');
        expect(projectionVsTargetStatus(900, 1000)).toBe('below');
        expect(projectionVsTargetStatus(1020, 1000)).toBe('on_track');
    });
});
