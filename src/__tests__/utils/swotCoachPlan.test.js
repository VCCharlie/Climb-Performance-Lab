import { describe, it, expect } from 'vitest';
import { buildCoachPlan, COACH_WORKOUT_LIBRARY } from '../../utils/swotCoachPlan';

const baseMetrics = {
    periodLabel: '1 jan – 31 jan',
    periodDays: 30,
    weeksInPeriod: 4.3,
    avgWeeklyLoad: 300,
    ridesPerWeek: 3.5,
    avgKmPerWeek: 180,
    avgHoursPerWeek: 6,
    avgElevPerWeek: 400,
    rideCount: 15,
    tssFirstHalf: null,
    tssSecondHalf: null,
};

describe('buildCoachPlan', () => {
    it('returns no_data focus when flags.noData', () => {
        const plan = buildCoachPlan({
            metrics: { ...baseMetrics, avgWeeklyLoad: 0, rideCount: 0 },
            flags: { noData: true },
            goalId: 'auto',
        });
        expect(plan.focus).toBe('no_data');
        expect(plan.weekPlan).toHaveLength(7);
        expect(plan.workouts).toHaveLength(0);
    });

    it('uses ceiling focus when goal is ceiling', () => {
        const plan = buildCoachPlan({
            metrics: baseMetrics,
            flags: { noData: false },
            goalId: 'ceiling',
        });
        expect(plan.focus).toBe('ceiling');
        expect(plan.weekPlan.some((d) => d.workoutId === 'vo2_4x5')).toBe(true);
        expect(plan.actions.length).toBeGreaterThan(0);
    });

    it('includes unique workouts from week plan', () => {
        const plan = buildCoachPlan({
            metrics: baseMetrics,
            flags: { noData: false },
            goalId: 'balanced',
        });
        const ids = plan.workouts.map((w) => w.id);
        expect(new Set(ids).size).toBe(ids.length);
        plan.workouts.forEach((w) => {
            expect(COACH_WORKOUT_LIBRARY[w.id]).toBeDefined();
            expect(w.zwoSteps?.length).toBeGreaterThan(0);
        });
    });
});
