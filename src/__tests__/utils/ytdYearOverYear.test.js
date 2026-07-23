import { describe, it, expect } from 'vitest';
import { computeCplYtdYearOverYear, percentChange, ytdComparisonWindows } from '../../utils/ytdYearOverYear';

describe('ytdYearOverYear', () => {
    const ref = new Date(2026, 6, 23); // 23 Jul 2026

    it('ytdComparisonWindows uses same calendar slice', () => {
        const w = ytdComparisonWindows(ref);
        expect(w.startThis).toBe('2026-01-01');
        expect(w.endThis).toBe('2026-07-23');
        expect(w.startPrev).toBe('2025-01-01');
        expect(w.endPrev).toBe('2025-07-23');
    });

    it('sums YTD vs previous year for CPL activities', () => {
        const activities = [
            { type: 'Ride', date: '2026-03-01', distance: 80, climbing: 900, moving_time: 7200, load: 80 },
            { type: 'Ride', date: '2025-03-01', distance: 60, climbing: 700, moving_time: 5400, load: 60 },
            { type: 'Ride', date: '2025-12-01', distance: 40, climbing: 200, moving_time: 3600, load: 40 },
        ];

        const result = computeCplYtdYearOverYear(activities, ref);
        expect(result?.thisYtd.count).toBe(1);
        expect(result?.thisYtd.distanceKm).toBe(80);
        expect(result?.prevYtd.count).toBe(1);
        expect(result?.prevYtd.distanceKm).toBe(60);
        expect(percentChange(80, 60)).toBeCloseTo(33.33, 1);
    });
});
