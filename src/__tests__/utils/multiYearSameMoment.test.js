import { describe, it, expect } from 'vitest';
import { computeMultiYearCompareRows, multiYearChartSeries, inferCompareYearCount } from '../../utils/multiYearSameMoment';

describe('multiYearSameMoment', () => {
    const ref = new Date(2026, 6, 23);

    it('returns YTD rows per year at same calendar moment', () => {
        const activities = [
            { type: 'Ride', date: '2026-06-01', distance: 100, climbing: 500, moving_time: 3600, load: 50 },
            { type: 'Ride', date: '2025-06-01', distance: 80, climbing: 400, moving_time: 3000, load: 40 },
            { type: 'Ride', date: '2025-12-01', distance: 200, climbing: 800, moving_time: 7200, load: 90 },
        ];

        const rows = computeMultiYearCompareRows(activities, ref, 3);
        const y2026 = rows.find((r) => r.year === 2026);
        const y2025 = rows.find((r) => r.year === 2025);
        expect(y2026?.distanceKm).toBe(100);
        expect(y2025?.distanceKm).toBe(80);
    });

    it('multiYearChartSeries converts moving time to hours', () => {
        const series = multiYearChartSeries(
            [{ year: 2026, count: 1, distanceKm: 10, elevationM: 100, movingTimeSec: 7200, load: 20 }],
            'movingTimeSec',
        );
        expect(series[0].value).toBe(2);
    });

    it('filters by sport type set', () => {
        const activities = [
            { type: 'Ride', date: '2026-06-01', distance: 100, climbing: 500, moving_time: 3600, load: 50 },
            { type: 'Run', date: '2026-06-01', distance: 10, climbing: 50, moving_time: 1800, load: 20 },
        ];
        const rows = computeMultiYearCompareRows(activities, ref, 3, new Set(['Ride']));
        const y2026 = rows.find((r) => r.year === 2026);
        expect(y2026?.distanceKm).toBe(100);
    });

    it('inferCompareYearCount spans oldest activity year', () => {
        const activities = [
            { type: 'Ride', date: '2011-03-01' },
            { type: 'Ride', date: '2026-01-01' },
        ];
        expect(inferCompareYearCount(activities, ref)).toBe(16);
    });

    it('tracks peak 20m and 60m power per year window', () => {
        const activities = [
            { type: 'Ride', date: '2026-06-01', best_20min: 300, best_60min: 280 },
            { type: 'Ride', date: '2025-06-01', best_20min: 320, best_60min: 290 },
            { type: 'Ride', date: '2025-07-01', best_20min: 310, best_60min: 285 },
        ];
        const rows = computeMultiYearCompareRows(activities, ref, 3, null, 'ytd', 280);
        const y2026 = rows.find((r) => r.year === 2026);
        const y2025 = rows.find((r) => r.year === 2025);
        expect(y2026?.peakBest20min).toBe(300);
        expect(y2026?.peakEftp20).toBe(285);
        expect(y2025?.peakBest20min).toBe(320);
        expect(y2025?.peakEftp20).toBe(304);
        expect(y2025?.peakBest60min).toBe(290);
    });
});
