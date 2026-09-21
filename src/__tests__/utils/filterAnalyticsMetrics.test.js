import { describe, it, expect } from 'vitest';
import {
    buildFilterAnalyticsChartData,
    buildFilterAnalyticsMetricChips,
    detectFilterAnalyticsPreset,
    getDefaultFilterAnalyticsMetricKeys,
    metricKeysForPreset,
    normalizeVisibleMetricKeys,
} from '../../utils/filterAnalyticsMetrics';
import { computeActivityLogFilterAnalytics } from '../../utils/activityLogFilterAnalytics';

const sampleActivities = [
    {
        id: 'a1',
        date: '2024-06-01',
        type: 'Ride',
        distance: 80,
        climbing: 1200,
        moving_time: '03:00:00',
        norm_power: 220,
        avg_power: 210,
        load: 120,
        avg_hr: 145,
        avg_speed: 26.7,
    },
    {
        id: 'a2',
        date: '2024-07-15',
        type: 'Ride',
        distance: 45,
        climbing: 400,
        moving_time: '01:30:00',
        norm_power: 180,
        avg_power: 175,
        load: 55,
        avg_hr: 132,
        avg_speed: 30,
    },
];

describe('filterAnalyticsMetrics', () => {
    it('getDefaultFilterAnalyticsMetricKeys returns essential totals', () => {
        const keys = getDefaultFilterAnalyticsMetricKeys();
        expect(keys).toContain('activities');
        expect(keys).toContain('distance_total');
        expect(keys).not.toContain('distance_avg');
    });

    it('metricKeysForPreset volume includes averages', () => {
        const keys = metricKeysForPreset('volume');
        expect(keys).toContain('distance_avg');
        expect(keys).toContain('time_avg');
    });

    it('detectFilterAnalyticsPreset matches essential preset', () => {
        const keys = metricKeysForPreset('essential');
        expect(detectFilterAnalyticsPreset(keys)).toBe('essential');
    });

    it('normalizeVisibleMetricKeys falls back when empty', () => {
        expect(normalizeVisibleMetricKeys([])).toEqual(getDefaultFilterAnalyticsMetricKeys());
    });

    it('buildFilterAnalyticsMetricChips includes avg metrics when requested', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        const chips = buildFilterAnalyticsMetricChips(
            ['activities', 'distance_avg', 'time_avg', 'avg_np', 'avg_power'],
            analytics,
        );
        expect(chips.map((c) => c.key)).toEqual([
            'activities',
            'distance_avg',
            'time_avg',
            'avg_np',
            'avg_power',
        ]);
        expect(chips.find((c) => c.key === 'distance_avg')?.value).toContain('km');
        expect(chips.find((c) => c.key === 'avg_power')?.value).toContain('W');
    });

    it('buildFilterAnalyticsChartData reverses years ascending for charts', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        const chartData = buildFilterAnalyticsChartData(analytics);
        expect(chartData).toHaveLength(1);
        expect(chartData[0].year).toBe('2024');
        expect(chartData[0].rides).toBe(2);
        expect(chartData[0].load).toBeGreaterThan(0);
    });
});
