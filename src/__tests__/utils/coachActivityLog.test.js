import { describe, it, expect } from 'vitest';
import {
    buildCoachActivityLog,
    serializeActivityForCoach,
    COACH_ACTIVITY_LOG_MAX_RIDES,
} from '../../utils/coach/coachActivityLog';

describe('coachActivityLog', () => {
    const activities = [
        {
            id: '1',
            date: '2024-06-15',
            type: 'Ride',
            title: 'Long Z2',
            distance: 85.4,
            climbing: 320,
            moving_time: 10800,
            load: 95,
            norm_power: 210,
            best_60min: 205,
        },
        {
            id: '2',
            date: '2023-03-01',
            type: 'VirtualRide',
            title: 'Trainer',
            distance: 42,
            climbing: 0,
            moving_time: 3600,
            load: 70,
            norm_power: 190,
            best_20min: 220,
        },
        {
            id: '3',
            date: '2026-08-01',
            type: 'Run',
            distance: 10,
            load: 40,
        },
    ];

    it('serializeActivityForCoach includes distance and elevation', () => {
        const row = serializeActivityForCoach(activities[0], 250);
        expect(row.distance).toBe(85.4);
        expect(row.climbing).toBe(320);
        expect(row.durationMin).toBe(180);
        expect(row.best_60min).toBe(205);
    });

    it('buildCoachActivityLog aggregates yearly distance and ride counts', () => {
        const log = buildCoachActivityLog(activities, 250, { endYmd: '2026-08-04' });
        expect(log.totals.rideCount).toBe(2);
        expect(log.yearlyStats.find((y) => y.year === 2024)?.distanceKm).toBe(85.4);
        expect(log.yearlyStats.find((y) => y.year === 2023)?.rideCount).toBe(1);
        expect(log.periodVolume.days28.distanceKm).toBeGreaterThanOrEqual(0);
        expect(log.rides[0].date).toBe('2024-06-15');
    });

    it('excludes non-ride sports from ride list', () => {
        const log = buildCoachActivityLog(activities, 250);
        expect(log.ridesTotal).toBe(2);
        expect(log.rides.every((r) => r.type !== 'Run')).toBe(true);
    });

    it('marks truncation when ride count exceeds cap', () => {
        const many = Array.from({ length: COACH_ACTIVITY_LOG_MAX_RIDES + 5 }, (_, i) => ({
            id: `r-${i}`,
            date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
            type: 'Ride',
            distance: 50,
            load: 50,
            moving_time: 3600,
        }));
        const log = buildCoachActivityLog(many, 250);
        expect(log.truncated).toBe(true);
        expect(log.ridesIncluded).toBe(COACH_ACTIVITY_LOG_MAX_RIDES);
        expect(log.yearlyStats[0].rideCount).toBe(many.length);
    });
});
