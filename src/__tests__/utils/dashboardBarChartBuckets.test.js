import { describe, it, expect } from 'vitest';
import {
    buildOverviewBarChartIndex,
    seriesFromBarChartIndex,
    formatBarChartPeriodLabel,
} from '../../utils/dashboardBarChartBuckets';

describe('buildOverviewBarChartIndex', () => {
    it('aggregates all metrics in one pass', () => {
        const acts = [
            { date: '2026-01-07', type: 'Ride', distance: 50, load: 80, climbing: 500, moving_time: 3600 },
            { date: '2026-01-08', type: 'VirtualRide', distance: 30, load: 40, climbing: 0, moving_time: 1800 },
        ];
        const index = buildOverviewBarChartIndex(acts);
        expect(index.week.all['2026-01-05'].distance).toBe(80);
        expect(index.week.outdoor['2026-01-05'].distance).toBe(50);
        expect(index.week.indoor['2026-01-05'].distance).toBe(30);
        expect(index.month.all['2026-01'].tss).toBe(120);
    });
});

describe('seriesFromBarChartIndex', () => {
    it('returns DD-MM-YYYY labels for month buckets', () => {
        const acts = [{ date: '2026-03-15', type: 'Ride', distance: 40, load: 50, climbing: 200, moving_time: 3600 }];
        const index = buildOverviewBarChartIndex(acts);
        const series = seriesFromBarChartIndex(index, 'month', 'all', 'distance');
        expect(series).toHaveLength(1);
        expect(series[0].label).toBe('01-03-2026');
        expect(series[0].periodLabel).toBe('March 2026');
        expect(series[0].value).toBe(40);
    });
});

describe('formatBarChartPeriodLabel', () => {
    it('formats month bucket as month name + year', () => {
        expect(formatBarChartPeriodLabel('month', '2026-07')).toBe('July 2026');
    });

    it('formats week bucket as Monday–Sunday range', () => {
        expect(formatBarChartPeriodLabel('week', '2026-01-05')).toBe('Week 5 Jan – 11 Jan 2026');
    });

    it('formats year bucket as year string', () => {
        expect(formatBarChartPeriodLabel('year', '2025')).toBe('2025');
    });
});
