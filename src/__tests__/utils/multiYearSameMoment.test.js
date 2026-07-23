import { describe, it, expect } from 'vitest';
import { computeMultiYearYtdAtSameMoment, multiYearChartSeries } from '../../utils/multiYearSameMoment';

describe('multiYearSameMoment', () => {
    const ref = new Date(2026, 6, 23);

    it('returns YTD rows per year at same calendar moment', () => {
        const activities = [
            { type: 'Ride', date: '2026-06-01', distance: 100, climbing: 500, moving_time: 3600, load: 50 },
            { type: 'Ride', date: '2025-06-01', distance: 80, climbing: 400, moving_time: 3000, load: 40 },
            { type: 'Ride', date: '2025-12-01', distance: 200, climbing: 800, moving_time: 7200, load: 90 },
        ];

        const rows = computeMultiYearYtdAtSameMoment(activities, ref, 3);
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
});
