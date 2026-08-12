import { describe, it, expect } from 'vitest';
import { trimPlannedVolume } from '../../utils/coach/coachWeekVolume';
import { buildWeekSkeleton } from '../../utils/coach/coachRebalancer';
import { applyAvailabilityRelocation } from '../../utils/coach/coachAvailability';

describe('coachWeekVolume', () => {
    const monday = '2026-08-10';

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

    it('does not trim future sessions when actual TSS is below target', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const plan = basePlanFromSkeleton(skeleton);
        const thursday = skeleton.find((s) => s.day === 'Thursday').date;
        const saturday = skeleton.find((s) => s.day === 'Saturday').date;

        const trimmed = trimPlannedVolume(plan, skeleton, {
            actualTss: 210,
            targetTss: 250,
            calendarYmd: '2026-08-11',
        });

        expect(trimmed.get(thursday).plannedStimulus).toBe('sweetspot');
        expect(trimmed.get(saturday).plannedStimulus).toBe('endurance');
    });

    it('eases future sessions when actual TSS is already at target', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const plan = basePlanFromSkeleton(skeleton);
        const thursday = skeleton.find((s) => s.day === 'Thursday').date;
        const saturday = skeleton.find((s) => s.day === 'Saturday').date;

        const trimmed = trimPlannedVolume(plan, skeleton, {
            actualTss: 250,
            targetTss: 250,
            calendarYmd: '2026-08-11',
        });

        expect(trimmed.get(saturday).plannedStimulus).toBe('rest');
        expect(trimmed.get(saturday).volumeSkipped).toBe(true);
        expect(trimmed.get(thursday).plannedStimulus).toBe('rest');
        expect(trimmed.get(thursday).volumeSkipped).toBe(true);
    });
});

describe('coachAvailability fulfilled blocked rides', () => {
    const monday = '2026-08-10';

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

    it('does not relocate a blocked workout that was already ridden', () => {
        const skeleton = buildWeekSkeleton(5, monday);
        const tuesday = skeleton.find((s) => s.day === 'Tuesday').date;
        const friday = skeleton.find((s) => s.day === 'Friday').date;

        const result = applyAvailabilityRelocation(
            skeleton,
            basePlanFromSkeleton(skeleton),
            [tuesday],
            '2026-08-11',
            [],
            {
                activities: [{ id: 'ride-1', date: tuesday, norm_power: 200, load: 80 }],
                ftp: 250,
            },
        );

        expect(result.relocations).toEqual([]);
        expect(result.assignment.get(tuesday).fulfilledOnBlockedDay).toBe(true);
        expect(result.assignment.get(friday).plannedStimulus).toBe('rest');
    });
});
