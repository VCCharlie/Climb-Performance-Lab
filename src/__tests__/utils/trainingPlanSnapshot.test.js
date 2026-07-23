import { describe, it, expect, beforeEach } from 'vitest';
import {
    weeksToGoalDate,
    resolveCurrentPlanWeek,
    buildTrainingPlanSnapshot,
    readTrainingPlanSnapshot,
    writeTrainingPlanSnapshot,
    hydrateTrainingPlanSnapshot,
    buildTaperRecoveryWarning,
    TRAINING_PLAN_STORAGE_KEY,
} from '../../utils/trainingPlanSnapshot';
import { computeTrainingGoalPlan } from '../../utils/trainingGoalPlan';

describe('weeksToGoalDate', () => {
    it('counts full weeks until goal', () => {
        const weeks = weeksToGoalDate('2026-08-20', new Date('2026-07-23'));
        expect(weeks).toBeGreaterThanOrEqual(3);
        expect(weeks).toBeLessThanOrEqual(5);
    });

    it('returns 0 for past dates', () => {
        expect(weeksToGoalDate('2020-01-01', new Date('2026-07-23'))).toBe(0);
    });
});

describe('resolveCurrentPlanWeek', () => {
    const weeks = [
        { weekNum: 1, targetTss: 200, phaseKey: 'base', phaseLabel: 'Base' },
        { weekNum: 2, targetTss: 220, phaseKey: 'build', phaseLabel: 'Build' },
        { weekNum: 3, targetTss: 120, phaseKey: 'taper', phaseLabel: 'Taper' },
    ];

    it('picks week 1 when event is 3 weeks out', () => {
        const w = resolveCurrentPlanWeek(weeks, '2026-08-13', new Date('2026-07-23'));
        expect(w?.weekNum).toBe(1);
    });

    it('picks taper week when event is soon', () => {
        const w = resolveCurrentPlanWeek(weeks, '2026-07-30', new Date('2026-07-23'));
        expect(w?.phaseKey).toBe('taper');
    });
});

describe('training plan snapshot storage', () => {
    beforeEach(() => {
        localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
    });

    it('builds and persists snapshot from plan result', () => {
        const planResult = computeTrainingGoalPlan({
            goalDateStr: '2026-09-15',
            activities: [{ date: '2026-07-01', load: 100 }],
            today: new Date('2026-07-23'),
            goalInputs: { distanceKm: 80, elevationM: 1200, durationHours: 4, targetPctFtp: 75 },
        });

        const snapshot = buildTrainingPlanSnapshot({
            goalDate: '2026-09-15',
            eventName: 'Alpe test',
            planResult,
        });

        expect(snapshot).not.toBeNull();
        expect(snapshot.eventName).toBe('Alpe test');
        expect(snapshot.weeks.length).toBeGreaterThan(0);
        expect(snapshot.currentWeekTargetTss).toBeGreaterThan(0);

        writeTrainingPlanSnapshot(snapshot);
        const read = readTrainingPlanSnapshot();
        expect(read?.goalDate).toBe('2026-09-15');
    });

    it('hydrates current week after time passes', () => {
        const snapshot = {
            goalDate: '2026-08-13',
            weeks: [
                { weekNum: 1, targetTss: 200, phaseKey: 'base', phaseLabel: 'Base' },
                { weekNum: 2, targetTss: 220, phaseKey: 'build', phaseLabel: 'Build' },
            ],
        };
        const hydrated = hydrateTrainingPlanSnapshot(snapshot, new Date('2026-07-30'));
        expect(hydrated.currentWeekNum).toBeGreaterThanOrEqual(1);
        expect(hydrated.weeksToEvent).toBeLessThan(4);
    });
});

describe('buildTaperRecoveryWarning', () => {
    it('warns during taper with negative TSB', () => {
        const warning = buildTaperRecoveryWarning(
            { isTaperPhase: true, eventName: 'Gran Fondo', weeksToEvent: 1 },
            -12,
        );
        expect(warning?.title).toMatch(/Taper/i);
        expect(warning?.message).toMatch(/Gran Fondo/);
    });

    it('returns null when TSB is acceptable', () => {
        expect(
            buildTaperRecoveryWarning({ isTaperPhase: true, eventName: 'Test' }, 5),
        ).toBeNull();
    });
});
