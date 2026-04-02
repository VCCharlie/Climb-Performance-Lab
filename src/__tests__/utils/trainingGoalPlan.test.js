import { describe, it, expect } from 'vitest';
import {
    estimateSessionTss,
    estimateGoalEventDemand,
    buildWeeklyGoalPlan,
    avgWeeklyTssRecent,
    computeTrainingGoalPlan,
} from '../../utils/trainingGoalPlan';

describe('estimateSessionTss', () => {
    it('matches IF-squared rule', () => {
        expect(estimateSessionTss(2, 0.8)).toBe(Math.round(2 * 100 * 0.8 * 0.8));
    });
});

describe('estimateGoalEventDemand', () => {
    it('uses explicit duration when provided', () => {
        const d = estimateGoalEventDemand({
            distanceKm: 100,
            elevationM: 2000,
            durationHours: 5,
            targetPctFtp: 80,
        });
        expect(d.durationHours).toBe(5);
        expect(d.targetPctFtp).toBe(80);
        expect(d.estimatedEventTss).toBeGreaterThan(200);
    });
});

describe('buildWeeklyGoalPlan', () => {
    it('returns empty weeks for zero weeks to event', () => {
        const p = buildWeeklyGoalPlan({
            weeksToEvent: 0,
            recentWeeklyTss: 200,
            eventDemand: { distanceKm: 50, elevationM: 500 },
            eventTss: 250,
        });
        expect(p.weeks).toHaveLength(0);
    });

    it('ends with taper weeks', () => {
        const p = buildWeeklyGoalPlan({
            weeksToEvent: 8,
            recentWeeklyTss: 200,
            eventDemand: { distanceKm: 80, elevationM: 1200 },
            eventTss: 280,
        });
        expect(p.weeks.length).toBe(8);
        expect(p.weeks[p.weeks.length - 1].phaseKey).toBe('taper');
        expect(p.weeks[p.weeks.length - 2].phaseKey).toBe('taper');
    });
});

describe('avgWeeklyTssRecent', () => {
    it('sums loads in window', () => {
        const end = new Date('2026-06-01');
        const acts = [
            { date: '2026-05-28', load: 100 },
            { date: '2026-05-29', load: 50 },
        ];
        const avg = avgWeeklyTssRecent(acts, end, 1);
        expect(avg).toBe(150);
    });
});

describe('computeTrainingGoalPlan', () => {
    it('returns error for invalid date', () => {
        const r = computeTrainingGoalPlan({
            goalDateStr: '',
            activities: [],
            goalInputs: { distanceKm: 50, elevationM: 500, durationHours: null, targetPctFtp: 75 },
        });
        expect(r.error).toBeDefined();
    });
});
