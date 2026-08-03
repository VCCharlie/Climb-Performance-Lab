import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWeekSkeleton, rebalanceWeek, downgradeStimulus } from '../../utils/coach/coachRebalancer';
import { buildFluidWeekPlan, getMondayYmd, computeWeekActuals } from '../../utils/coach/coachWeekPlan';
import { readCoachWeekState, writeCoachWeekState } from '../../utils/coach/coachWeekState';

describe('coachRebalancer', () => {
    it('downgradeStimulus steps down the ladder', () => {
        expect(downgradeStimulus('vo2')).toBe('threshold');
        expect(downgradeStimulus('sweetspot')).toBe('endurance');
        expect(downgradeStimulus('recovery')).toBe('recovery');
    });

    it('rebalanceWeek eases sessions when TSS is high', () => {
        const plan = {
            targetTss: 200,
            sessions: [
                { date: '2026-08-03', stimulus: 'sweetspot' },
                { date: '2026-08-05', stimulus: 'threshold' },
            ],
        };
        const result = rebalanceWeek(plan, { tssThisWeek: 250 }, '2026-08-03');
        expect(result[0].stimulus).toBe('endurance');
        expect(result[0].note).toBeTruthy();
    });

    it('buildWeekSkeleton maps days from Monday', () => {
        const week = buildWeekSkeleton(5, '2026-08-03');
        expect(week).toHaveLength(7);
        expect(week[0].day).toBe('Monday');
        expect(week[0].date).toBe('2026-08-03');
        expect(week.find((d) => d.day === 'Thursday')?.stimulus).toBe('sweetspot');
    });
});

describe('coachWeekPlan', () => {
    it('getMondayYmd returns Monday for mid-week date', () => {
        expect(getMondayYmd('2026-08-06')).toBe('2026-08-03');
    });

    it('buildFluidWeekPlan includes TSS progress', () => {
        const activities = [
            { id: '1', date: '2026-08-04', load: 80, norm_power: 200, moving_time: 3600 },
        ];
        const coachContext = {
            athlete: { ftp: 250 },
            fitness: { tsb: 5 },
        };
        const plan = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext,
            referenceYmd: '2026-08-06',
        });
        expect(plan.targetTss).toBe(250);
        expect(plan.actualTss).toBe(80);
        expect(plan.sessions).toHaveLength(7);
    });
});

describe('coachWeekState', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            store: {},
            getItem(k) { return this.store[k] ?? null; },
            setItem(k, v) { this.store[k] = v; },
            removeItem(k) { delete this.store[k]; },
        });
    });

    it('resets state for new week', () => {
        writeCoachWeekState('2026-08-03', { completedDates: ['2026-08-04'] });
        const next = readCoachWeekState('2026-08-10');
        expect(next.completedDates).toEqual([]);
    });
});
