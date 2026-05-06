import { describe, it, expect } from 'vitest';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
    boundsFromYmdRange,
    calendarYearBounds,
    boundsToYmdPair,
    aggregatePeriodStats,
    aggregateStatsFromLongestRideRows,
    topNLongestRidesByDistanceKm,
} from '../../utils/dashboardActivityWindow';

describe('getDashboardWindowBounds', () => {
    it('returns 1M window ending on reference date', () => {
        const ref = new Date('2026-06-15T12:00:00Z');
        const b = getDashboardWindowBounds('1M', '', '', ref);
        expect(b).not.toBeNull();
        expect(b.end.getFullYear()).toBe(2026);
        expect(b.end.getMonth()).toBe(5);
        expect(b.end.getDate()).toBe(15);
        expect(b.start.getFullYear()).toBe(2026);
        expect(b.start.getMonth()).toBe(4);
        expect(b.start.getDate()).toBe(15);
    });
});

describe('filterActivitiesInBounds', () => {
    it('includes only activities in range', () => {
        const acts = [
            { date: '2026-01-01', id: 1 },
            { date: '2026-06-01', id: 2 },
            { date: '2027-01-01', id: 3 },
        ];
        const bounds = {
            start: new Date('2026-05-01'),
            end: new Date('2026-12-31T23:59:59.999'),
        };
        const f = filterActivitiesInBounds(acts, bounds);
        expect(f.map((a) => a.id)).toEqual([2]);
    });
});

describe('previousWindowBounds', () => {
    it('shifts window back by same length', () => {
        const bounds = {
            start: new Date('2026-06-01'),
            end: new Date('2026-06-30T23:59:59.999'),
        };
        const prev = previousWindowBounds(bounds);
        expect(prev).not.toBeNull();
        const len = bounds.end.getTime() - bounds.start.getTime();
        expect(prev.end.getTime() - prev.start.getTime()).toBe(len);
        expect(prev.end.getTime()).toBeLessThan(bounds.start.getTime());
    });
});

describe('boundsFromYmdRange', () => {
    it('returns null for invalid range', () => {
        expect(boundsFromYmdRange('', '2026-01-01')).toBeNull();
        expect(boundsFromYmdRange('2026-01-10', '2026-01-01')).toBeNull();
    });

    it('returns start/end of day', () => {
        const b = boundsFromYmdRange('2026-03-01', '2026-03-02');
        expect(b.start.getHours()).toBe(0);
        expect(b.end.getHours()).toBe(23);
    });
});

describe('calendarYearBounds', () => {
    it('covers full year', () => {
        const b = calendarYearBounds(2025);
        expect(b.start.getMonth()).toBe(0);
        expect(b.start.getDate()).toBe(1);
        expect(b.end.getMonth()).toBe(11);
        expect(b.end.getDate()).toBe(31);
    });
});

describe('boundsToYmdPair', () => {
    it('formats YYYY-MM-DD', () => {
        const b = boundsFromYmdRange('2026-06-01', '2026-06-15');
        const p = boundsToYmdPair(b);
        expect(p.startYmd).toBe('2026-06-01');
        expect(p.endYmd).toBe('2026-06-15');
    });
});

describe('aggregatePeriodStats', () => {
    it('sums distance and climbing', () => {
        const acts = [
            { distance: 50, climbing: 500, avg_speed: 25 },
            { distance: 30, climbing: 300, avg_speed: 27 },
        ];
        const s = aggregatePeriodStats(acts);
        expect(s.rideCount).toBe(2);
        expect(s.distanceKm).toBe(80);
        expect(s.elevationM).toBe(800);
        expect(s.avgDistanceKm).toBe(40);
        expect(s.avgSpeedKmh).toBe(26);
    });

    it('returns null averages when empty or no speeds', () => {
        expect(aggregatePeriodStats([]).avgDistanceKm).toBeNull();
        expect(aggregatePeriodStats([]).avgSpeedKmh).toBeNull();
        const noSpeed = [{ distance: 10, climbing: 100 }];
        const s = aggregatePeriodStats(noSpeed);
        expect(s.avgDistanceKm).toBe(10);
        expect(s.avgSpeedKmh).toBeNull();
    });
});

describe('aggregateStatsFromLongestRideRows', () => {
    it('matches aggregatePeriodStats on the listed rides only', () => {
        const acts = [
            { id: 1, distance: 50, climbing: 500, avg_speed: 25 },
            { id: 2, distance: 100, climbing: 800, avg_speed: 28 },
            { id: 3, distance: 30, climbing: 200, avg_speed: 22 },
        ];
        const rows = topNLongestRidesByDistanceKm(acts, 2);
        const s = aggregateStatsFromLongestRideRows(rows);
        expect(s.rideCount).toBe(2);
        expect(s.distanceKm).toBe(150);
        expect(s.elevationM).toBe(1300);
        expect(s.avgDistanceKm).toBe(75);
        expect(s.avgSpeedKmh).toBeCloseTo(26.5, 5);
    });

    it('returns zero rides when rows empty', () => {
        const s = aggregateStatsFromLongestRideRows([]);
        expect(s.rideCount).toBe(0);
        expect(s.avgDistanceKm).toBeNull();
    });
});

describe('topNLongestRidesByDistanceKm', () => {
    it('orders by km descending and caps at n', () => {
        const acts = [
            { id: 1, distance: 50 },
            { id: 2, distance: 120 },
            { id: 3, distance: 80 },
        ];
        const r = topNLongestRidesByDistanceKm(acts, 2);
        expect(r.map((x) => x.activity.id)).toEqual([2, 3]);
        expect(r[0].km).toBe(120);
    });
});

describe('compareDaysBeforeWindow', () => {
    it('covers N calendar days before start', () => {
        const bounds = {
            start: new Date('2026-06-10T00:00:00'),
            end: new Date('2026-06-15T23:59:59.999'),
        };
        const prev = compareDaysBeforeWindow(bounds, 3);
        expect(prev.start.getDate()).toBe(7);
        expect(prev.end.getDate()).toBe(9);
    });
});
