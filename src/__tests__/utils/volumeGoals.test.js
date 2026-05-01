import { describe, it, expect } from 'vitest';
import {
    defaultVolumeGoals,
    mergeVolumeGoals,
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
