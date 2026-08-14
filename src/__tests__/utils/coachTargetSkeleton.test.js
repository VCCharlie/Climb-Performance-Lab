import { describe, it, expect } from 'vitest';
import { addDaysToYmd } from '../../utils/dashboardVolumeTotals';
import { analyzeRidingPattern, sessionCountForTarget } from '../../utils/coach/coachRidingPattern';
import {
    buildTargetAlignedSkeleton,
    sumSkeletonPlannedTss,
    intensityBiasedSessionTss,
} from '../../utils/coach/coachTargetSkeleton';
import { buildWeekSkeleton } from '../../utils/coach/coachRebalancer';

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

describe('coachRidingPattern', () => {
    it('detects intensity-biased riding when avg TSS per ride is high', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        expect(pattern.intensityBias).toBe('intensity');
        expect(pattern.avgTssPerRide).toBeGreaterThanOrEqual(100);
        expect(pattern.ridesPerWeek).toBeGreaterThan(3);
    });

    it('sessionCountForTarget blends habit and target math', () => {
        const pattern = analyzeRidingPattern(makeIntensityActivities(), '2026-08-06', 8);
        const count = sessionCountForTarget(428, pattern, 6);
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(6);
    });
});

describe('coachTargetSkeleton', () => {
    it('scales skeleton when event goal TSS exceeds hours-based plan', () => {
        const monday = '2026-08-03';
        const base = buildWeekSkeleton(6, monday);
        const baseTss = sumSkeletonPlannedTss(base, 6, 'volume');
        expect(baseTss).toBeLessThan(300);

        const aligned = buildTargetAlignedSkeleton({
            weeklyHours: 6,
            startYmd: monday,
            targetTss: 428,
            activities: makeIntensityActivities(),
            referenceYmd: '2026-08-06',
            phaseKey: 'base',
            baseSkeleton: base,
        });

        expect(aligned.targetAligned).toBe(true);
        expect(aligned.plannedTss).toBeGreaterThan(350);
        expect(aligned.pattern.intensityBias).toBe('intensity');

        const workoutDays = aligned.sessions.filter((s) => s.stimulus !== 'rest');
        expect(workoutDays.length).toBeGreaterThanOrEqual(3);
        const z2Only = workoutDays.every((s) => s.stimulus === 'endurance');
        expect(z2Only).toBe(false);
    });

    it('keeps hours skeleton when target is close to default plan', () => {
        const monday = '2026-08-03';
        const base = buildWeekSkeleton(5, monday);
        const aligned = buildTargetAlignedSkeleton({
            weeklyHours: 5,
            startYmd: monday,
            targetTss: 250,
            activities: [],
            referenceYmd: '2026-08-06',
            phaseKey: null,
            baseSkeleton: base,
        });
        expect(aligned.targetAligned).toBe(false);
        expect(aligned.sessions).toEqual(base);
    });

    it('intensityBiasedSessionTss reflects harder rides', () => {
        expect(intensityBiasedSessionTss('sweetspot')).toBeGreaterThan(95);
        expect(intensityBiasedSessionTss('threshold')).toBeGreaterThan(115);
    });
});
