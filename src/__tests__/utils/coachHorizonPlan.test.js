import { describe, it, expect, beforeEach } from 'vitest';
import {
    buildEventHorizonFluidPlans,
    horizonWeekPanelTitle,
    isDateInWeek,
} from '../../utils/coach/coachHorizonPlan';
import { buildFluidWeekPlan } from '../../utils/coach/coachWeekPlan';
import {
    buildTrainingPlanSnapshot,
    writeTrainingPlanSnapshot,
    TRAINING_PLAN_STORAGE_KEY,
} from '../../utils/trainingPlanSnapshot';
import { computeTrainingGoalPlan } from '../../utils/trainingGoalPlan';

describe('coachHorizonPlan', () => {
    beforeEach(() => {
        localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
    });

    it('isDateInWeek detects calendar week membership', () => {
        expect(isDateInWeek('2026-08-06', '2026-08-03', '2026-08-09')).toBe(true);
        expect(isDateInWeek('2026-08-10', '2026-08-03', '2026-08-09')).toBe(false);
    });

    it('buildEventHorizonFluidPlans returns single week without event goal', () => {
        const week1 = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-06',
        });

        const bundle = buildEventHorizonFluidPlans({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            week1Plan: week1,
            referenceYmd: '2026-08-06',
        });

        expect(bundle.eventHorizonActive).toBe(false);
        expect(bundle.horizonWeeks).toHaveLength(1);
    });

    it('buildEventHorizonFluidPlans builds all remaining event weeks', () => {
        const planResult = computeTrainingGoalPlan({
            goalDateStr: '2026-09-15',
            activities: Array.from({ length: 32 }, (_, i) => ({
                date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
                type: 'Ride',
                load: 120,
            })),
            today: new Date('2026-08-06'),
            goalInputs: { distanceKm: 100, elevationM: 0, durationHours: 4, targetPctFtp: 75 },
        });

        writeTrainingPlanSnapshot(buildTrainingPlanSnapshot({
            goalDate: '2026-09-15',
            eventName: 'Century ride',
            goalInputs: {
                source: 'custom',
                customEventName: 'Century ride',
                distanceKm: 100,
                elevationM: 0,
                durationHours: 4,
                targetPctFtp: 75,
            },
            planResult,
        }));

        const week1 = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 6, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 5 } },
            referenceYmd: '2026-08-06',
        });

        const bundle = buildEventHorizonFluidPlans({
            activities: [],
            userSettings: { weeklyHoursTarget: 6, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 5 } },
            week1Plan: week1,
            referenceYmd: '2026-08-06',
        });

        expect(bundle.eventHorizonActive).toBe(true);
        expect(bundle.horizonWeekCount).toBeGreaterThan(2);
        expect(bundle.horizonWeeks[0].planWeekNum).toBeTruthy();
        expect(bundle.horizonWeeks[1].mondayYmd).toBe('2026-08-10');

        const phases = bundle.horizonWeeks.map((w) => w.phaseKey || w.planPhaseLabel);
        expect(phases.some((p) => p)).toBe(true);
    });

    it('horizonWeekPanelTitle labels current and future weeks', () => {
        const current = {
            mondayYmd: '2026-08-03',
            sundayYmd: '2026-08-09',
            planWeekNum: 3,
            phaseLabel: 'Base / volume',
        };
        expect(horizonWeekPanelTitle(current, '2026-08-06')).toContain('This week');

        const future = {
            mondayYmd: '2026-08-10',
            sundayYmd: '2026-08-16',
            planWeekNum: 4,
            planPhaseLabel: 'Build / load',
        };
        expect(horizonWeekPanelTitle(future, '2026-08-06')).toBe('Week 4 · Build / load');
    });
});
