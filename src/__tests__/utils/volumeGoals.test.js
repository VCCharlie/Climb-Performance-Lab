import { describe, it, expect } from 'vitest';
import {
    defaultVolumeGoals,
    mergeVolumeGoals,
    mergeVolumeGoalsPreservingNonZero,
    normalizeYearlyVolumeGoals,
    deriveVolumeGoalsFromYearlyGoals,
    hydrateYearlyGoalsFromLegacy,
    scaleVolumeGoals,
    currentWeekRange,
    currentMonthRange,
    currentYearRange,
    sumVolumeForRange,
    progressPercent,
    calendarElapsedRatio,
    calendarProgressLabel,
    getVolumeScheduleStatus,
} from '../../utils/volumeGoals.js';

describe('volumeGoals', () => {
    it('defaultVolumeGoals returns zero targets', () => {
        const d = defaultVolumeGoals();
        expect(d.weekly.distanceKm).toBe(0);
        expect(d.monthly.movingTimeHours).toBe(0);
        expect(d.yearly.elevationM).toBe(0);
    });

    it('mergeVolumeGoals fills missing keys and clamps negatives', () => {
        const m = mergeVolumeGoals({
            weekly: { distanceKm: 100 },
            monthly: { movingTimeHours: -5, elevationM: 2000 },
        });
        expect(m.weekly.distanceKm).toBe(100);
        expect(m.weekly.movingTimeHours).toBe(0);
        expect(m.monthly.movingTimeHours).toBe(0);
        expect(m.monthly.elevationM).toBe(2000);
        expect(m.yearly.distanceKm).toBe(0);
    });

    it('mergeVolumeGoalsPreservingNonZero keeps local targets when cloud is empty', () => {
        const local = mergeVolumeGoals({
            monthly: { distanceKm: 400, movingTimeHours: 12, elevationM: 5000 },
        });
        const cloud = defaultVolumeGoals();
        const m = mergeVolumeGoalsPreservingNonZero(local, cloud);
        expect(m.monthly.distanceKm).toBe(400);
        expect(m.monthly.elevationM).toBe(5000);
    });

    it('mergeVolumeGoalsPreservingNonZero prefers non-zero cloud over local', () => {
        const local = mergeVolumeGoals({ yearly: { distanceKm: 1000 } });
        const cloud = mergeVolumeGoals({ yearly: { distanceKm: 8000 } });
        const m = mergeVolumeGoalsPreservingNonZero(local, cloud);
        expect(m.yearly.distanceKm).toBe(8000);
    });

    it('deriveVolumeGoalsFromYearlyGoals splits yearly targets by 52 and 12', () => {
        const derived = deriveVolumeGoalsFromYearlyGoals({
            yearlyKm: 5200,
            yearlyMovingTimeHours: 520,
            yearlyElevationM: 52000,
        });
        expect(derived.yearly.distanceKm).toBe(5200);
        expect(derived.weekly.distanceKm).toBe(100);
        expect(derived.monthly.distanceKm).toBeCloseTo(433.3, 1);
        expect(derived.weekly.movingTimeHours).toBe(10);
        expect(derived.monthly.movingTimeHours).toBeCloseTo(43.33, 1);
        expect(derived.weekly.elevationM).toBe(1000);
        expect(derived.monthly.elevationM).toBe(4333);
    });

    it('hydrateYearlyGoalsFromLegacy copies yearly volumeGoals when settings goals are empty', () => {
        const goals = hydrateYearlyGoalsFromLegacy(
            { yearlyKm: 0, yearlyMovingTimeHours: 0, yearlyElevationM: 0 },
            { yearly: { distanceKm: 8000, movingTimeHours: 400, elevationM: 90000 } },
        );
        expect(goals.yearlyKm).toBe(8000);
        expect(goals.yearlyMovingTimeHours).toBe(400);
        expect(goals.yearlyElevationM).toBe(90000);
    });

    it('scaleVolumeGoals applies preview multiplier without mutating base', () => {
        const base = deriveVolumeGoalsFromYearlyGoals({ yearlyKm: 5200 });
        const scaled = scaleVolumeGoals(base, 1.1);
        expect(scaled.yearly.distanceKm).toBe(5720);
        expect(base.yearly.distanceKm).toBe(5200);
    });

    it('normalizeYearlyVolumeGoals clamps negatives', () => {
        expect(normalizeYearlyVolumeGoals({ yearlyKm: -10 }).yearlyKm).toBe(0);
    });

    it('currentYearRange covers full calendar year', () => {
        const ref = new Date(2026, 4, 1); // May 1 local
        const r = currentYearRange(ref);
        expect(r.startYmd).toBe('2026-01-01');
        expect(r.endYmd).toBe('2026-12-31');
        expect(r.label).toBe('2026');
    });

    it('currentMonthRange spans calendar month', () => {
        const ref = new Date(2026, 0, 15);
        const r = currentMonthRange(ref);
        expect(r.startYmd).toBe('2026-01-01');
        expect(r.endYmd).toBe('2026-01-31');
    });

    it('currentWeekRange is Monday–Sunday containing ref', () => {
        // Friday 2026-05-01 → week Mon Apr 27 – Sun May 3
        const ref = new Date(2026, 4, 1);
        const r = currentWeekRange(ref);
        expect(r.startYmd).toBe('2026-04-27');
        expect(r.endYmd).toBe('2026-05-03');
    });

    it('sumVolumeForRange sums Ride types in inclusive YMD window', () => {
        const acts = [
            { date: '2026-05-01', type: 'Ride', distance: 50, moving_time: 3600, climbing: 500 },
            { date: '2026-05-02', type: 'Ride', distance: 30, moving_time: '1:00:00', climbing: 200 },
            { date: '2026-05-03', type: 'Swim', distance: 5, moving_time: 1800, climbing: 0 },
            { date: '2026-04-30', type: 'Ride', distance: 99, moving_time: 7200, climbing: 1000 },
        ];
        const s = sumVolumeForRange(acts, '2026-05-01', '2026-05-02');
        expect(s.distanceKm).toBeCloseTo(80, 5);
        expect(s.movingTimeSec).toBe(3600 + 3600);
        expect(s.elevationM).toBe(700);
    });

    it('progressPercent caps at 100', () => {
        expect(progressPercent(50, 100)).toBe(50);
        expect(progressPercent(150, 100)).toBe(100);
        expect(progressPercent(10, 0)).toBe(0);
    });

    it('calendarElapsedRatio is 0 at period start and ~1 at end', () => {
        const range = { startYmd: '2026-05-01', endYmd: '2026-05-07' };
        const start = new Date(2026, 4, 1, 8, 0, 0, 0);
        expect(calendarElapsedRatio(range, start)).toBe(0);
        const mid = new Date(2026, 4, 4, 12, 0, 0, 0);
        const r = calendarElapsedRatio(range, mid);
        expect(r).toBeGreaterThan(0.4);
        expect(r).toBeLessThan(0.6);
    });

    it('calendarProgressLabel returns day of period', () => {
        const range = { startYmd: '2026-05-01', endYmd: '2026-05-07' };
        const ref = new Date(2026, 4, 3);
        const lbl = calendarProgressLabel(range, ref);
        expect(lbl.spanDays).toBe(7);
        expect(lbl.dayOfPeriod).toBe(3);
    });

    it('getVolumeScheduleStatus compares current to linear expectation', () => {
        const range = { startYmd: '2026-01-01', endYmd: '2026-12-31' };
        const midYear = new Date(2026, 6, 1);
        const st = getVolumeScheduleStatus(600, 1200, range, midYear);
        expect(st.status).not.toBe('no_target');
        expect(st.expectedCurrent).toBeGreaterThan(500);
        expect(st.expectedCurrent).toBeLessThan(700);
    });
});
