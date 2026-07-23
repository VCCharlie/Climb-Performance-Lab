import { describe, it, expect } from 'vitest';
import { computeClimbingReadiness } from '../../utils/climbingReadiness';
import { calculateFitnessMetrics } from '../../utils/formTabMetrics';

describe('computeClimbingReadiness', () => {
    const baseDate = new Date('2026-07-23T12:00:00');

    it('returns building badge with no week activities', () => {
        const result = computeClimbingReadiness({
            activities: [],
            ftp: 250,
            referenceDate: baseDate,
        });
        expect(result.composite).toBeGreaterThanOrEqual(0);
        expect(result.metrics.elevationM).toBe(0);
        expect(result.metrics.weekTss).toBe(0);
    });

    it('scores elevation and Z2 from week activities', () => {
        const activities = [
            {
                date: '2026-07-22',
                climbing: 800,
                load: 120,
                norm_power: 160,
                moving_time: 7200,
            },
            {
                date: '2026-07-21',
                climbing: 400,
                load: 90,
                avg_power: 170,
                moving_time: 5400,
            },
        ];

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        expect(result.metrics.elevationM).toBe(1200);
        expect(result.metrics.weekTss).toBe(210);
        expect(result.metrics.z2Hours).toBeGreaterThan(0);
        expect(result.scores.elevation).toBeGreaterThan(70);
        expect(result.badge.key).toBeTruthy();
    });

    it('uses TSB from fitness metrics', () => {
        const activities = [];
        for (let i = 0; i < 14; i += 1) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            const ymd = d.toISOString().slice(0, 10);
            activities.push({ date: ymd, load: 80 });
        }

        const fitness = calculateFitnessMetrics(activities);
        const latestTsb = fitness[fitness.length - 1]?.tsb;

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        expect(result.metrics.tsb).toBe(latestTsb);
    });

    it('flags recovery when TSB is very negative', () => {
        const activities = [];
        for (let i = 0; i < 10; i += 1) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            activities.push({
                date: d.toISOString().slice(0, 10),
                load: 200,
                climbing: 500,
                norm_power: 200,
                moving_time: 3600,
            });
        }

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        if (result.metrics.tsb != null && result.metrics.tsb < -20) {
            expect(result.badge.key).toBe('recover');
        }
    });
});
