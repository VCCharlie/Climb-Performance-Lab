import { describe, it, expect, beforeEach } from 'vitest';
import {
    isTrainingGoalActive,
    resolveFluidWeekTarget,
    resolveTrainingGoalDisplayName,
    trainingGoalFormDefaultsFromSnapshot,
} from '../../utils/trainingGoalLink';
import {
    buildTrainingPlanSnapshot,
    TRAINING_PLAN_STORAGE_KEY,
    writeTrainingPlanSnapshot,
} from '../../utils/trainingPlanSnapshot';
import { computeTrainingGoalPlan } from '../../utils/trainingGoalPlan';

describe('trainingGoalLink', () => {
    beforeEach(() => {
        localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
    });

    it('resolveFluidWeekTarget falls back to hours budget without snapshot', () => {
        const result = resolveFluidWeekTarget({
            userSettings: { weeklyHoursTarget: 5 },
            referenceYmd: '2026-08-06',
        });
        expect(result.source).toBe('hours-budget');
        expect(result.targetTss).toBe(250);
        expect(result.trainingGoal).toBeNull();
    });

    it('resolveFluidWeekTarget uses event goal TSS when snapshot is active', () => {
        const planResult = computeTrainingGoalPlan({
            goalDateStr: '2026-09-15',
            activities: [{ date: '2026-07-01', load: 100 }],
            today: new Date('2026-07-23'),
            goalInputs: { distanceKm: 80, elevationM: 1200, durationHours: 4, targetPctFtp: 75 },
        });

        const snapshot = buildTrainingPlanSnapshot({
            goalDate: '2026-09-15',
            eventName: 'Gran Fondo',
            goalInputs: {
                source: 'custom',
                distanceKm: 80,
                elevationM: 1200,
                durationHours: 4,
                targetPctFtp: 75,
            },
            planResult,
        });

        writeTrainingPlanSnapshot(snapshot);

        const result = resolveFluidWeekTarget({
            userSettings: { weeklyHoursTarget: 5 },
            referenceYmd: '2026-07-23',
        });

        expect(result.source).toBe('event-goal');
        expect(result.targetTss).toBe(result.trainingGoal.currentWeekTargetTss);
        expect(result.targetTss).not.toBe(result.hoursBudgetTss);
        expect(result.phaseKey).toBeTruthy();
        expect(result.trainingGoal?.displayName).toBe('Gran Fondo');
        expect(result.trainingGoal?.eventName).toBe('Gran Fondo');
        expect(result.hoursBudgetTss).toBe(250);
    });

    it('resolveTrainingGoalDisplayName prefers customEventName over generic stored title', () => {
        expect(
            resolveTrainingGoalDisplayName({
                snapshot: {
                    eventName: 'Training goal',
                    goalInputs: { customEventName: 'Liège–Bastogne–Liège' },
                },
            }),
        ).toBe('Liège–Bastogne–Liège');
    });

    it('resolveTrainingGoalDisplayName falls back to climb search then distance', () => {
        expect(
            resolveTrainingGoalDisplayName({
                goalInputs: { climbSearch: 'Mont Ventoux' },
            }),
        ).toBe('Mont Ventoux');

        expect(
            resolveTrainingGoalDisplayName({
                goalInputs: { distanceKm: 120, elevationM: 2500 },
            }),
        ).toBe('120 km · 2500 m');
    });

    it('trainingGoalFormDefaultsFromSnapshot restores customEventName when eventName is generic', () => {
        const defaults = trainingGoalFormDefaultsFromSnapshot({
            goalDate: '2026-09-01',
            eventName: 'Training goal',
            goalInputs: {
                source: 'custom',
                customEventName: 'My fondo',
                distanceKm: 80,
                elevationM: 1200,
            },
        });

        expect(defaults.eventName).toBe('My fondo');
    });

    it('isTrainingGoalActive returns false after goal date', () => {
        expect(
            isTrainingGoalActive({ goalDate: '2020-01-01', weeks: [{ weekNum: 1 }] }, new Date('2026-07-23')),
        ).toBe(false);
    });

    it('trainingGoalFormDefaultsFromSnapshot restores form fields', () => {
        const defaults = trainingGoalFormDefaultsFromSnapshot({
            goalDate: '2026-09-01',
            eventName: 'Alpe test',
            goalInputs: {
                source: 'climb',
                climbSearch: 'Alpe d\'Huez',
                distanceKm: 13.8,
                elevationM: 1100,
                durationHours: 1.5,
                targetPctFtp: 80,
            },
        });

        expect(defaults.goalDate).toBe('2026-09-01');
        expect(defaults.eventName).toBe('Alpe test');
        expect(defaults.source).toBe('climb');
        expect(defaults.targetPctFtp).toBe(80);
    });
});
