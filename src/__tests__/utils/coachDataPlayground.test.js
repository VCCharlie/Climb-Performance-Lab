import { describe, it, expect } from 'vitest';
import {
    buildTrendPlaygroundData,
    resolvePlaygroundCompareRange,
    playgroundRangeForYears,
} from '../../utils/coach/coachDataPlayground';

describe('coachDataPlayground', () => {
    const activities = [
        { date: '2024-01-15', type: 'Ride', distance: 50, climbing: 100, load: 60, moving_time: 3600 },
        { date: '2024-02-10', type: 'Ride', distance: 70, climbing: 200, load: 80, moving_time: 4200 },
        { date: '2023-06-01', type: 'Ride', distance: 40, climbing: 50, load: 45, moving_time: 3000 },
    ];

    it('buildTrendPlaygroundData aggregates monthly distance', () => {
        const result = buildTrendPlaygroundData(activities, {
            cadence: 'monthly',
            metricId: 'distanceKm',
            startYmd: '2023-01-01',
            endYmd: '2024-12-31',
            compareMode: 'none',
            trendWindow: 2,
        });
        expect(result.primaryTotal).toBe(160);
        expect(result.chartData.length).toBeGreaterThanOrEqual(2);
        expect(result.chartData[0].trend).toBeDefined();
    });

    it('resolvePlaygroundCompareRange shifts previous period', () => {
        const range = resolvePlaygroundCompareRange('previous', '2024-01-01', '2024-03-31');
        expect(range?.startYmd).toBeTruthy();
        expect(range?.endYmd).toBeTruthy();
        expect(range.endYmd < '2024-01-01').toBe(true);
    });

    it('playgroundRangeForYears spans calendar years', () => {
        const range = playgroundRangeForYears('2026-08-04', 3);
        expect(range.startYmd).toBe('2024-01-01');
        expect(range.endYmd).toBe('2026-08-04');
    });
});
