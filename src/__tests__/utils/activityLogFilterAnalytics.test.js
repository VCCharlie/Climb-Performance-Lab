import { describe, it, expect } from 'vitest';
import {
    buildActivityLogFilterLabels,
    buildActivityLogFilterStateFromBarProps,
    isActivityLogFilterActive,
} from '../../utils/activityLogFilterActive';
import {
    aggregateActivityListMetrics,
    aggregateActivityMetricsByYear,
    computeActivityLogFilterAnalytics,
    formatTotalMovingTime,
    percentOf,
} from '../../utils/activityLogFilterAnalytics';

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
        load: 55,
        avg_hr: 132,
        avg_speed: 30,
    },
    {
        id: 'a3',
        date: '2023-09-10',
        type: 'VirtualRide',
        distance: 30,
        climbing: 200,
        moving_time: '01:00:00',
        norm_power: 200,
        load: 40,
        avg_hr: 150,
        avg_speed: 30,
    },
];

describe('activityLogFilterActive', () => {
    it('buildActivityLogFilterLabels includes long ride and sport types', () => {
        const labels = buildActivityLogFilterLabels({
            longRideOnly: true,
            activeSportTypes: ['GravelRide', 'Ride'],
        });
        expect(labels).toContain('Long ride');
        expect(labels).toContain('Gravel');
        expect(labels).toContain('Ride');
    });

    it('isActivityLogFilterActive is true when subset differs from full log', () => {
        expect(isActivityLogFilterActive({}, [sampleActivities[0]], sampleActivities)).toBe(true);
    });

    it('buildActivityLogFilterStateFromBarProps merges route-level filters', () => {
        const state = buildActivityLogFilterStateFromBarProps(
            { longRideOnly: true, activeSportTypes: ['Ride'] },
            { singleDayFilterYmd: '2024-06-01' },
        );
        expect(state.longRideOnly).toBe(true);
        expect(state.singleDayFilterYmd).toBe('2024-06-01');
    });
});

describe('activityLogFilterAnalytics', () => {
    it('formatTotalMovingTime renders hours and minutes', () => {
        expect(formatTotalMovingTime(5400)).toBe('1h 30m');
        expect(formatTotalMovingTime(0)).toBe('0h');
    });

    it('percentOf returns one decimal place', () => {
        expect(percentOf(25, 100)).toBe(25);
        expect(percentOf(1, 3)).toBe(33.3);
    });

    it('aggregateActivityListMetrics sums distance, time, and load', () => {
        const agg = aggregateActivityListMetrics(sampleActivities, 250);
        expect(agg.rideCount).toBe(3);
        expect(agg.distanceKm).toBe(155);
        expect(agg.movingTimeSec).toBe(19800);
        expect(agg.loadSum).toBe(215);
        expect(agg.npCount).toBe(3);
    });

    it('aggregateActivityMetricsByYear groups by calendar year', () => {
        const byYear = aggregateActivityMetricsByYear(sampleActivities, 250);
        expect(byYear).toHaveLength(2);
        expect(byYear[0].year).toBe('2024');
        expect(byYear[0].rideCount).toBe(2);
        expect(byYear[1].year).toBe('2023');
    });

    it('computeActivityLogFilterAnalytics includes share of full log', () => {
        const filtered = [sampleActivities[0], sampleActivities[1]];
        const result = computeActivityLogFilterAnalytics(filtered, sampleActivities, 250);
        expect(result.rideCount).toBe(2);
        expect(result.totalRideCount).toBe(3);
        expect(result.rideCountPct).toBeCloseTo(66.7, 1);
        expect(result.distanceKm).toBe(125);
        expect(result.distancePctOfAll).toBeCloseTo(80.6, 1);
        expect(result.avgNormPower).toBe(200);
        expect(result.byYear).toHaveLength(1);
    });
});
