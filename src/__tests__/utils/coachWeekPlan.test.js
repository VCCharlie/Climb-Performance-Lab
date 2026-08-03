import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWeekSkeleton, rebalanceWeek, downgradeStimulus } from '../../utils/coach/coachRebalancer';
import { buildFluidWeekPlan, getMondayYmd, computeWeekActuals, applySessionMoves } from '../../utils/coach/coachWeekPlan';
import { readCoachWeekState, writeCoachWeekState, moveSession } from '../../utils/coach/coachWeekState';

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
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            store: {},
            getItem(k) { return this.store[k] ?? null; },
            setItem(k, v) { this.store[k] = v; },
            removeItem(k) { delete this.store[k]; },
        });
    });

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

    it('buildFluidWeekPlan moves session to another day', () => {
        moveSession('2026-08-03', '2026-08-04', '2026-08-03');

        const plan = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-03',
        });

        const monday = plan.sessions.find((s) => s.date === '2026-08-03');
        const tuesday = plan.sessions.find((s) => s.date === '2026-08-04');
        expect(monday.movedFromDate).toBe('2026-08-04');
        expect(monday.plannedStimulus).toBe('endurance');
        expect(tuesday.movedToDate).toBe('2026-08-03');
        expect(tuesday.stimulus).toBe('rest');
    });

    it('buildFluidWeekPlan auto-matches cross-day sweetspot ride', () => {
        const activities = [
            { id: 'ride-1', date: '2026-08-03', norm_power: 230, load: 70 },
        ];
        const plan = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-03',
        });

        const monday = plan.sessions.find((s) => s.date === '2026-08-03');
        expect(monday.plannedStimulus).toBe('rest');

        const matched = plan.sessions.filter((s) => s.matchedOnDate);
        expect(matched).toEqual([
            expect.objectContaining({
                date: '2026-08-06',
                completed: true,
                matchedOnDate: '2026-08-03',
            }),
        ]);
    });

    it('applySessionMoves vacates source day', () => {
        const basePlan = new Map([
            ['2026-08-03', { day: 'Monday', plannedStimulus: 'rest' }],
            ['2026-08-04', { day: 'Tuesday', plannedStimulus: 'sweetspot' }],
        ]);
        const { movedTo, vacatedDates } = applySessionMoves(basePlan, { '2026-08-04': '2026-08-03' });
        expect(vacatedDates.has('2026-08-04')).toBe(true);
        expect(movedTo.get('2026-08-03').plannedStimulus).toBe('sweetspot');
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

    it('persists session moves within the same week', () => {
        moveSession('2026-08-03', '2026-08-04', '2026-08-03');
        const state = readCoachWeekState('2026-08-03');
        expect(state.moves['2026-08-04']).toBe('2026-08-03');
    });
});
