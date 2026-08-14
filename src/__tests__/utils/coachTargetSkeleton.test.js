import { describe, it, expect } from 'vitest';
import { addDaysToYmd } from '../../utils/dashboardVolumeTotals';
import { analyzeRidingPattern } from '../../utils/coach/coachRidingPattern';
import {
    resolveDevelopmentStrategy,
    developmentAdjustedWeekTss,
    isIntensityHeavyHabit,
} from '../../utils/coach/coachDevelopmentStrategy';
import {
    buildAerobicDevelopmentSkeleton,
    buildWeekSkeletonForStrategy,
    sumSkeletonPlannedTss,
} from '../../utils/coach/coachTargetSkeleton';
import { buildWeekSkeleton } from '../../utils/coach/coachRebalancer';
import { buildWeeklyGoalPlan } from '../../utils/trainingGoalPlan';

function makeIntensityActivities() {
    const rides = [];
    const windowStart = '2026-06-12';
    for (let w = 0; w < 8; w += 1) {
        const loads = [120, 140, 110, 130];
        loads.forEach((load, i) => {
            rides.push({
                id: `r-${w}-${i}`,
                date: addDaysToYmd(windowStart, w * 7 + i),
                type: 'Ride',
                load,
            });
        });
    }
    return rides;
}

describe('coachDevelopmentStrategy', () => {
    it('detects intensity-heavy habitual load', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        expect(isIntensityHeavyHabit(pattern)).toBe(true);
    });

    it('recommends aerobic development in base phase instead of matching habit', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        const strategy = resolveDevelopmentStrategy(pattern, 397, 'base');
        expect(strategy.mode).toBe('develop-aerobic');
        expect(strategy.fluidSkeleton).toBe('aerobic-development');
        expect(strategy.maxHardSessions).toBe(1);
    });

    it('lowers macro TSS below recent load for development', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        const strategy = resolveDevelopmentStrategy(pattern, 397, 'base');
        const week1 = developmentAdjustedWeekTss(397, strategy, 'base', 0, 6);
        const peak = developmentAdjustedWeekTss(397, strategy, 'base', 5, 6);
        expect(week1).toBeLessThan(397);
        expect(peak).toBeLessThan(397);
        expect(peak).toBeGreaterThan(week1);
    });
});

describe('coachTargetSkeleton — aerobic development', () => {
    it('builds Z2-first skeleton instead of scaling up intensity', () => {
        const monday = '2026-08-03';
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        const strategy = resolveDevelopmentStrategy(pattern, 397, 'base');
        const base = buildWeekSkeleton(6, monday);

        const aligned = buildWeekSkeletonForStrategy({
            strategy,
            weeklyHours: 6,
            startYmd: monday,
            phaseKey: 'base',
            activities: makeIntensityActivities(),
            referenceYmd: '2026-08-06',
            recentWeeklyTss: 397,
            baseSkeleton: base,
        });

        expect(aligned.developmentMode).toBe('develop-aerobic');
        const workouts = aligned.sessions.filter((s) => s.stimulus !== 'rest');
        const hardDays = workouts.filter((s) => ['sweetspot', 'threshold', 'vo2'].includes(s.stimulus));
        expect(hardDays.length).toBeLessThanOrEqual(1);
        expect(workouts.filter((s) => s.stimulus === 'endurance').length).toBeGreaterThanOrEqual(2);
        expect(aligned.plannedTss).toBeLessThan(350);
    });

    it('aerobic development skeleton has long Z2 emphasis', () => {
        const sessions = buildAerobicDevelopmentSkeleton(6, '2026-08-03', 'base', 1);
        expect(sessions.find((s) => s.day === 'Saturday')?.stimulus).toBe('endurance');
        expect(sessions.find((s) => s.day === 'Thursday')?.stimulus).toBe('sweetspot');
        expect(sumSkeletonPlannedTss(sessions, 6)).toBeGreaterThan(200);
    });
});

describe('trainingGoalPlan — development macro', () => {
    it('lowers weekly targets for intensity-heavy athletes', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        const plan = buildWeeklyGoalPlan({
            weeksToEvent: 8,
            recentWeeklyTss: 397,
            eventDemand: { distanceKm: 100, elevationM: 0 },
            eventTss: 201,
            ridingPattern: pattern,
        });

        expect(plan.developmentMode).toBe('develop-aerobic');
        expect(plan.weeks[0].targetTss).toBeLessThan(397);
        expect(plan.peakTarget).toBeLessThan(397);
    });
});
