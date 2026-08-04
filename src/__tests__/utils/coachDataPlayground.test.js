import { describe, it, expect } from 'vitest';
import {
    buildTrendPlaygroundData,
    resolvePlaygroundCompareRange,
    playgroundRangeForYears,
} from '../../utils/coach/coachDataPlayground';
import { buildExplorerData, pearsonCorrelation, activityMetricValue } from '../../utils/coach/coachPlaygroundExplorer';
import { bucketMetricValue } from '../../utils/coach/coachPlaygroundBuckets';

describe('coachDataPlayground', () => {
    const activities = [
        { date: '2024-01-15', type: 'Ride', distance: 50, climbing: 100, load: 60, moving_time: 3600, norm_power: 220, avg_power: 200, avg_speed: 28, rpe: 6, avg_hr: 145 },
        { date: '2024-02-10', type: 'Ride', distance: 70, climbing: 200, load: 80, moving_time: 4200, norm_power: 240, avg_power: 210, avg_speed: 30, rpe: 7, avg_hr: 150 },
        { date: '2023-06-01', type: 'Ride', distance: 40, climbing: 50, load: 45, moving_time: 3000, norm_power: 210, avg_power: 190, avg_speed: 26, rpe: 5, avg_hr: 140 },
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

    it('buildTrendPlaygroundData supports performance metrics', () => {
        const result = buildTrendPlaygroundData(activities, {
            cadence: 'yearly',
            metricId: 'normPower',
            startYmd: '2023-01-01',
            endYmd: '2024-12-31',
            compareMode: 'none',
            trendWindow: 2,
        });
        const y2024 = result.chartData.find((r) => r.key === '2024');
        expect(y2024?.value).toBeGreaterThan(200);
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

    it('buildTrendPlaygroundData supports yearly cadence and max values', () => {
        const result = buildTrendPlaygroundData(activities, {
            cadence: 'yearly',
            metricId: 'distanceKm',
            startYmd: '2023-01-01',
            endYmd: '2024-12-31',
            compareMode: 'none',
            trendWindow: 2,
        });
        expect(result.chartData.some((r) => r.label === '2024' || r.key === '2024')).toBe(true);
        expect(result.chartData[0].maxValue).toBeDefined();
    });
});

describe('coachPlaygroundExplorer', () => {
    const activities = [
        { date: '2024-01-15', type: 'Ride', distance: 50, moving_time: 3600, avg_hr: 140, avg_speed: 28, best_20min: 280 },
        { date: '2024-02-10', type: 'Ride', distance: 70, moving_time: 4200, avg_hr: 150, avg_speed: 30, best_20min: 290 },
        { date: '2023-06-01', type: 'Ride', distance: 40, moving_time: 3000, avg_hr: 130, avg_speed: 26, best_20min: 270 },
        { date: '2023-09-01', type: 'Ride', distance: 60, moving_time: 3600, avg_hr: 145, avg_speed: 29, best_20min: 275 },
    ];

    it('activityMetricValue reads performance fields', () => {
        expect(activityMetricValue(activities[0], 'normPower')).toBeNull();
        expect(activityMetricValue({ ...activities[0], norm_power: 230 }, 'normPower')).toBe(230);
        expect(activityMetricValue(activities[0], 'avgSpeed')).toBe(28);
    });

    it('buildExplorerData produces scatter points for HR vs speed by year', () => {
        const result = buildExplorerData(activities, {
            cadence: 'yearly',
            startYmd: '2023-01-01',
            endYmd: '2024-12-31',
            xMetric: 'avgHr',
            yMetric: 'avgSpeed',
            colorMetric: 'distanceKm',
        });
        expect(result.scatterPoints.length).toBeGreaterThanOrEqual(2);
        expect(result.scatterPoints[0].x).toBeGreaterThan(0);
        expect(result.scatterPoints[0].y).toBeGreaterThan(0);
    });

    it('buildExplorerData computes top-N power per year bucket', () => {
        const result = buildExplorerData(activities, {
            cadence: 'yearly',
            startYmd: '2023-01-01',
            endYmd: '2024-12-31',
            xMetric: 'distanceKm',
            yMetric: 'best_20min_topN',
            topN: 2,
        });
        const y2024 = result.points.find((p) => p.key === '2024');
        expect(y2024?.y).toBeGreaterThan(280);
    });

    it('pearsonCorrelation returns value for correlated series', () => {
        const r = pearsonCorrelation([
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
            { x: 4, y: 8 },
        ]);
        expect(r).toBe(1);
    });

    it('bucketMetricValue supports power peak topN', () => {
        const bucket = {
            powerPeaks: { best_20min: [300, 290, 280, 270] },
            distanceKm: 100,
        };
        expect(bucketMetricValue(bucket, 'best_20min_topN', 'primary', { topN: 2 })).toBe(295);
    });
});
