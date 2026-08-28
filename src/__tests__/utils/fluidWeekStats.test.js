import { describe, it, expect } from 'vitest';
import {
    isSessionMissed,
    shouldIncludeInProjection,
    resolveSessionTssForProjection,
    computeWeekTssProjection,
    computeWeekPlannedHours,
    planHoursExceedBudget,
} from '../../utils/coach/fluidWeekStats';

function buildSession(overrides = {}) {
    return {
        date: '2026-08-07',
        day: 'Friday',
        stimulus: 'endurance',
        plannedStimulus: 'endurance',
        completed: false,
        isToday: false,
        isPast: false,
        isUnavailable: false,
        movedToDate: null,
        ...overrides,
    };
}

describe('fluidWeekStats', () => {
    describe('isSessionMissed', () => {
        it('flags past incomplete training days as missed', () => {
            expect(isSessionMissed(buildSession({
                date: '2026-08-06',
                isPast: true,
                plannedStimulus: 'sweetspot',
            }))).toBe(true);
        });

        it('does not flag blocked or rest days', () => {
            expect(isSessionMissed(buildSession({
                date: '2026-08-06',
                isPast: true,
                isUnavailable: true,
            }))).toBe(false);

            expect(isSessionMissed(buildSession({
                date: '2026-08-06',
                isPast: true,
                plannedStimulus: 'rest',
            }))).toBe(false);
        });
    });

    describe('shouldIncludeInProjection', () => {
        it('excludes missed and blocked sessions', () => {
            expect(shouldIncludeInProjection(buildSession({
                isPast: true,
                plannedStimulus: 'threshold',
            }))).toBe(false);

            expect(shouldIncludeInProjection(buildSession({
                isUnavailable: true,
                plannedStimulus: 'endurance',
            }))).toBe(false);
        });

        it('includes completed and upcoming sessions', () => {
            expect(shouldIncludeInProjection(buildSession({
                completed: true,
                isPast: true,
            }))).toBe(true);

            expect(shouldIncludeInProjection(buildSession({
                isPast: false,
                plannedStimulus: 'vo2',
            }))).toBe(true);
        });
    });

    describe('resolveSessionTssForProjection', () => {
        it('uses logged TSS when activity exists on that date', () => {
            const session = buildSession({ date: '2026-08-05', completed: true, isPast: true });
            const tss = resolveSessionTssForProjection(session, 5, { '2026-08-05': 92 });
            expect(tss).toBe(92);
        });

        it('returns zero for missed sessions', () => {
            const session = buildSession({
                date: '2026-08-06',
                isPast: true,
                plannedStimulus: 'sweetspot',
            });
            expect(resolveSessionTssForProjection(session, 5)).toBe(0);
        });
    });

    describe('computeWeekTssProjection', () => {
        const weekPlan = {
            targetTss: 287,
            actualTss: 57,
            sessions: [
                buildSession({
                    date: '2026-08-03',
                    isPast: true,
                    completed: true,
                    plannedStimulus: 'endurance',
                }),
                buildSession({
                    date: '2026-08-04',
                    isPast: true,
                    plannedStimulus: 'rest',
                }),
                buildSession({
                    date: '2026-08-06',
                    isPast: true,
                    plannedStimulus: 'sweetspot',
                }),
                buildSession({
                    date: '2026-08-07',
                    isToday: true,
                    isPast: false,
                    plannedStimulus: 'endurance',
                }),
                buildSession({
                    date: '2026-08-08',
                    isPast: false,
                    plannedStimulus: 'vo2',
                }),
                buildSession({
                    date: '2026-08-09',
                    isPast: false,
                    plannedStimulus: 'recovery',
                }),
            ],
        };

        it('sums done + remaining sessions and excludes missed', () => {
            const activities = [{ id: '1', date: '2026-08-03', load: 57 }];
            const result = computeWeekTssProjection(weekPlan, activities, 5);

            expect(result.loggedTss).toBe(57);
            expect(result.excludedMissedCount).toBe(1);
            expect(result.projectedTss).toBeGreaterThan(result.loggedTss);
            expect(result.targetTss).toBe(287);
        });

        it('excludes blocked sessions from projection', () => {
            const blockedPlan = {
                ...weekPlan,
                sessions: [
                    ...weekPlan.sessions,
                    buildSession({
                        date: '2026-08-05',
                        isUnavailable: true,
                        plannedStimulus: 'recovery',
                    }),
                ],
            };

            const withBlock = computeWeekTssProjection(blockedPlan, [], 5);
            const withoutBlock = computeWeekTssProjection(weekPlan, [], 5);

            expect(withBlock.excludedBlockedCount).toBe(1);
            expect(withBlock.projectedTss).toBeLessThanOrEqual(withoutBlock.projectedTss);
        });
    });

    describe('computeWeekPlannedHours', () => {
        it('sums template-based durations for included sessions', () => {
            const weekPlan = {
                sessions: [
                    buildSession({
                        plannedStimulus: 'endurance',
                        fluidWorkout: { totalMinutes: { min: 80, max: 100 } },
                    }),
                    buildSession({
                        plannedStimulus: 'sweetspot',
                        fluidWorkout: { totalMinutes: { min: 75, max: 95 } },
                    }),
                    buildSession({
                        date: '2026-08-06',
                        isPast: true,
                        plannedStimulus: 'threshold',
                    }),
                ],
            };

            const { plannedHours, sessionCount } = computeWeekPlannedHours(weekPlan, 5);
            expect(sessionCount).toBe(2);
            expect(plannedHours).toBeGreaterThan(2);
        });
    });

    describe('planHoursExceedBudget', () => {
        it('detects when planned hours exceed weekly budget', () => {
            expect(planHoursExceedBudget(6.2, 5)).toBe(true);
            expect(planHoursExceedBudget(4.8, 5)).toBe(false);
        });
    });
});
