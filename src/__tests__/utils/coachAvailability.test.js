import { describe, it, expect } from 'vitest';
import { buildWeekSkeleton } from '../../utils/coach/coachRebalancer';
import { applyAvailabilityRelocation } from '../../utils/coach/coachAvailability';

describe('coachAvailability', () => {
    const monday = '2026-08-03';

    function basePlanFromSkeleton(skeleton) {
        const map = new Map();
        for (const row of skeleton) {
            map.set(row.date, {
                ...row,
                plannedStimulus: row.stimulus,
                originalStimulus: row.stimulus,
                note: null,
            });
        }
        return map;
    }

    it('relocates Thursday sweetspot when Wed–Fri blocked', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const basePlan = basePlanFromSkeleton(skeleton);
        const wed = skeleton.find((s) => s.day === 'Wednesday').date;
        const thu = skeleton.find((s) => s.day === 'Thursday').date;
        const fri = skeleton.find((s) => s.day === 'Friday').date;

        const result = applyAvailabilityRelocation(
            skeleton,
            basePlan,
            [wed, thu, fri],
            monday,
        );

        expect(result.relocations.length).toBeGreaterThan(0);
        const sweetspotMove = result.relocations.find((r) => r.stimulus === 'sweetspot');
        expect(sweetspotMove).toBeTruthy();
        expect(sweetspotMove.fromDate).toBe(thu);
        expect([sweetspotMove.toDate]).not.toContain(thu);
        expect(result.assignment.get(thu).plannedStimulus).toBe('rest');
        expect(result.assignment.get(thu).unavailable).toBe(true);
    });

    it('returns null assignment when no blocked days', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const result = applyAvailabilityRelocation(skeleton, basePlanFromSkeleton(skeleton), [], monday);
        expect(result.assignment).toBeNull();
    });

    it('prefers explicitly available rest days for relocation', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const basePlan = basePlanFromSkeleton(skeleton);
        const tue = skeleton.find((s) => s.day === 'Tuesday').date;
        const wed = skeleton.find((s) => s.day === 'Wednesday').date;
        const thu = skeleton.find((s) => s.day === 'Thursday').date;

        basePlan.set(tue, {
            ...basePlan.get(tue),
            plannedStimulus: 'rest',
            originalStimulus: 'endurance',
            note: null,
        });

        const result = applyAvailabilityRelocation(
            skeleton,
            basePlan,
            [wed, thu],
            monday,
            [tue],
        );

        const sweetspotMove = result.relocations.find((r) => r.stimulus === 'sweetspot');
        expect(sweetspotMove).toBeTruthy();
        expect(sweetspotMove.toDate).toBe(tue);
    });
});
