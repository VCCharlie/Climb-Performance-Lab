import { describe, it, expect } from 'vitest';
import {
    buildFilterAnalyticsSummaryChips,
    buildYearChartSeries,
    buildYearTableColumns,
    FILTER_ANALYTICS_YEAR_TABLE_COLUMNS,
} from '../../utils/filterAnalyticsYearTable';
import { computeActivityLogFilterAnalytics } from '../../utils/activityLogFilterAnalytics';
import { metricKeysForPreset } from '../../utils/filterAnalyticsMetrics';

const sampleActivities = [
    {
        id: 'a1',
        date: '2024-06-01',
        type: 'Ride',
        distance: 80,
        climbing: 1200,
        moving_time: '03:00:00',
        norm_power: 220,
        load: 120,
        avg_hr: 145,
    },
    {
        id: 'a2',
        date: '2024-07-15',
        type: 'Ride',
        distance: 45,
        climbing: 400,
        moving_time: '01:30:00',
        norm_power: 180,
        load: 55,
    },
];

describe('filterAnalyticsYearTable', () => {
    it('buildYearTableColumns maps picker keys to table headers', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        const columns = buildYearTableColumns(
            ['activities', 'distance_avg', 'time_avg', 'tss_total'],
            analytics.byYear,
        );
        expect(columns.map((c) => c.key)).toEqual([
            'activities',
            'distance_avg',
            'time_avg',
            'tss_total',
        ]);
        expect(columns[1].header).toBe('Dist (avg)');
    });

    it('buildYearTableColumns omits columns with no data in any row', () => {
        const row = {
            year: '2020',
            rideCount: 1,
            distanceKm: 10,
            movingTimeSec: 3600,
            elevationM: 0,
            loadSum: 0,
            avgDistanceKm: 10,
            avgMovingTimeSec: 3600,
            avgElevationM: 0,
            avgLoad: null,
            avgNormPower: null,
            avgPower: null,
            avgHeartRate: null,
            avgSpeedKmh: null,
            avgIntensityFactor: null,
        };
        const columns = buildYearTableColumns(['avg_if'], [row]);
        expect(columns).toHaveLength(0);
    });

    it('year row includes avg distance from aggregation', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        expect(analytics.byYear[0].avgDistanceKm).toBe(62.5);
        const col = FILTER_ANALYTICS_YEAR_TABLE_COLUMNS.distance_avg;
        expect(col.getValue(analytics.byYear[0])).toBe('62,5 km');
    });

    it('buildFilterAnalyticsSummaryChips builds compact totals above the table', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        const chips = buildFilterAnalyticsSummaryChips(
            analytics,
            ['distance_total', 'time_total', 'elevation_total'],
        );
        expect(chips[0].key).toBe('activities');
        expect(chips.some((c) => c.key === 'distance_total')).toBe(true);
    });

    it('essential preset keys all have year table column defs', () => {
        for (const key of metricKeysForPreset('essential')) {
            expect(FILTER_ANALYTICS_YEAR_TABLE_COLUMNS[key]).toBeTruthy();
        }
    });

    it('buildYearChartSeries mirrors visible year table columns', () => {
        const analytics = computeActivityLogFilterAnalytics(sampleActivities, sampleActivities, 250);
        const series = buildYearChartSeries(
            ['activities', 'distance_avg', 'time_avg', 'avg_np'],
            analytics.byYear,
        );
        expect(series.map((s) => s.key)).toEqual(['activities', 'distance_avg', 'time_avg', 'avg_np']);
        expect(series[0].dataKey).toBe('rideCount');
        expect(series[1].dataKey).toBe('avgDistanceKm');
    });
});
