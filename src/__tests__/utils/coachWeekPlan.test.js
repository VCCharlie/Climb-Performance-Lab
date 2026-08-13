import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWeekSkeleton, rebalanceWeek, downgradeStimulus, applyPhaseToWeekSkeleton } from '../../utils/coach/coachRebalancer';
import { buildFluidWeekPlan, buildProjectedWeek2Plan, getMondayYmd, computeWeekActuals, applySessionMoves } from '../../utils/coach/coachWeekPlan';
import { readCoachWeekState, writeCoachWeekState, moveSession, toggleUnavailableDate, toggleAvailableDate } from '../../utils/coach/coachWeekState';
import { buildTrainingPlanSnapshot, writeTrainingPlanSnapshot, TRAINING_PLAN_STORAGE_KEY } from '../../utils/trainingPlanSnapshot';
import { computeTrainingGoalPlan } from '../../utils/trainingGoalPlan';

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

    it('applyPhaseToWeekSkeleton eases intensity in taper', () => {
        const week = buildWeekSkeleton(7, '2026-08-03');
        const tapered = applyPhaseToWeekSkeleton(week, 'taper');
        expect(tapered.find((d) => d.day === 'Sunday')?.stimulus).toBe('endurance');
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
        expect(plan.targetTssSource).toBe('hours-budget');
        expect(plan.actualTss).toBe(80);
        expect(plan.sessions).toHaveLength(7);
    });

    it('buildFluidWeekPlan uses active event goal TSS when snapshot exists', () => {
        const planResult = computeTrainingGoalPlan({
            goalDateStr: '2026-09-15',
            activities: [{ date: '2026-07-01', load: 100 }],
            today: new Date('2026-08-06'),
            goalInputs: { distanceKm: 80, elevationM: 1200, durationHours: 4, targetPctFtp: 75 },
        });

        writeTrainingPlanSnapshot(buildTrainingPlanSnapshot({
            goalDate: '2026-09-15',
            eventName: 'Test event',
            goalInputs: {
                source: 'custom',
                distanceKm: 80,
                elevationM: 1200,
                durationHours: 4,
                targetPctFtp: 75,
            },
            planResult,
        }));

        const plan = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-06',
        });

        expect(plan.targetTssSource).toBe('event-goal');
        expect(plan.targetTss).toBe(plan.trainingGoal.currentWeekTargetTss);
        expect(plan.trainingGoal?.eventName).toBe('Test event');
        expect(plan.phaseKey).toBeTruthy();

        localStorage.removeItem(TRAINING_PLAN_STORAGE_KEY);
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

    it('buildFluidWeekPlan auto-matches cross-day sweetspot ride once session day has passed', () => {
        const activities = [
            { id: 'ride-1', date: '2026-08-03', norm_power: 230, load: 70 },
        ];
        const planOnMonday = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-03',
        });

        const monday = planOnMonday.sessions.find((s) => s.date === '2026-08-03');
        expect(monday.plannedStimulus).toBe('rest');
        expect(monday.stimulus).toBe('completed');
        expect(monday.workoutName).toMatch(/Ride logged/i);

        const thursdayOnMonday = planOnMonday.sessions.find((s) => s.date === '2026-08-06');
        expect(thursdayOnMonday.completed).toBe(false);
        expect(thursdayOnMonday.matchedOnDate).toBeNull();

        const planOnThursday = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-07',
            calendarYmd: '2026-08-07',
        });

        const thursday = planOnThursday.sessions.find((s) => s.date === '2026-08-06');
        expect(thursday.completed).toBe(true);
        expect(thursday.matchedOnDate).toBe('2026-08-03');
        expect(thursday.flexNote).toMatch(/Completed via Monday ride/i);
    });

    it('buildFluidWeekPlan does not mark today done from yesterdays ride', () => {
        const plan = buildFluidWeekPlan({
            activities: [{ id: 'ride-1', date: '2026-08-03', norm_power: 200, load: 60 }],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-04',
        });

        const monday = plan.sessions.find((s) => s.date === '2026-08-03');
        const tuesday = plan.sessions.find((s) => s.date === '2026-08-04');
        expect(monday.completed).toBe(true);
        expect(monday.flexNote).not.toMatch(/matched Tuesday/i);
        expect(tuesday.completed).toBe(false);
        expect(tuesday.stimulus).not.toBe('completed');
        expect(tuesday.plannedStimulus).toBe('endurance');
    });

    it('buildFluidWeekPlan restores persisted session matches', () => {
        writeCoachWeekState('2026-08-03', {
            sessionMatches: {
                '2026-08-06': {
                    activityId: 'ride-1',
                    activityDate: '2026-08-03',
                    matchedStimulus: 'sweetspot',
                },
            },
        });

        const plan = buildFluidWeekPlan({
            activities: [{ id: 'ride-1', date: '2026-08-03', norm_power: 230, load: 70 }],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-07',
            calendarYmd: '2026-08-07',
        });

        const thursday = plan.sessions.find((s) => s.date === '2026-08-06');
        expect(thursday.completed).toBe(true);
        expect(thursday.matchedOnDate).toBe('2026-08-03');
    });

    it('buildFluidWeekPlan ignores stale persisted match onto today', () => {
        writeCoachWeekState('2026-08-03', {
            sessionMatches: {
                '2026-08-04': {
                    activityId: 'ride-1',
                    activityDate: '2026-08-03',
                    matchedStimulus: 'endurance',
                },
            },
        });

        const plan = buildFluidWeekPlan({
            activities: [{ id: 'ride-1', date: '2026-08-03', norm_power: 200, load: 60 }],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-04',
        });

        const tuesday = plan.sessions.find((s) => s.date === '2026-08-04');
        expect(tuesday.completed).toBe(false);
        expect(tuesday.matchedOnDate).toBeNull();
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

    it('buildFluidWeekPlan reschedules when days are blocked', () => {
        toggleUnavailableDate('2026-08-03', '2026-08-05');
        toggleUnavailableDate('2026-08-03', '2026-08-06');
        toggleUnavailableDate('2026-08-03', '2026-08-07');

        const plan = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-03',
        });

        expect(plan.hasAvailabilityBlocks).toBe(true);
        expect(plan.availabilityNote).toBeTruthy();
        const thursday = plan.sessions.find((s) => s.date === '2026-08-06');
        expect(thursday.isUnavailable).toBe(true);
    });

    it('buildFluidWeekPlan relocates to explicitly available rest day after move', () => {
        moveSession('2026-08-03', '2026-08-04', '2026-08-03');
        toggleAvailableDate('2026-08-03', '2026-08-04');
        toggleUnavailableDate('2026-08-03', '2026-08-05');
        toggleUnavailableDate('2026-08-03', '2026-08-06');
        toggleUnavailableDate('2026-08-03', '2026-08-07');
        toggleUnavailableDate('2026-08-03', '2026-08-09');

        const plan = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-03',
        });

        const tuesday = plan.sessions.find((s) => s.date === '2026-08-04');
        expect(tuesday.isExplicitlyAvailable).toBe(true);
        expect(tuesday.plannedStimulus).toBe('sweetspot');
        expect(tuesday.relocatedFromDate).toBe('2026-08-06');
    });

    it('buildFluidWeekPlan keeps future sessions open after blocking a day with an earlier ride', () => {
        const activities = [
            { id: 'ride-1', date: '2026-08-10', norm_power: 230, load: 70 },
        ];
        toggleUnavailableDate('2026-08-10', '2026-08-11');

        const plan = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-10',
            calendarYmd: '2026-08-10',
        });

        const monday = plan.sessions.find((s) => s.date === '2026-08-10');
        const tuesday = plan.sessions.find((s) => s.date === '2026-08-11');
        const wednesday = plan.sessions.find((s) => s.date === '2026-08-12');
        const thursday = plan.sessions.find((s) => s.date === '2026-08-13');

        expect(monday.stimulus).toBe('completed');
        expect(tuesday.isUnavailable).toBe(true);
        expect(wednesday.relocatedFromDate).toBe('2026-08-11');
        expect(wednesday.completed).toBe(false);
        expect(wednesday.stimulus).not.toBe('completed');
        expect(thursday.completed).toBe(false);
        expect(thursday.matchedOnDate).toBeNull();
    });

    it('buildFluidWeekPlan does not reschedule blocked Tuesday endurance after it was ridden', () => {
        const activities = [
            { id: 'ride-mon', date: '2026-08-10', norm_power: 230, load: 90 },
            { id: 'ride-tue', date: '2026-08-11', norm_power: 200, load: 80 },
        ];
        toggleUnavailableDate('2026-08-10', '2026-08-10');
        toggleUnavailableDate('2026-08-10', '2026-08-11');

        const plan = buildFluidWeekPlan({
            activities,
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-11',
            calendarYmd: '2026-08-11',
        });

        const tuesday = plan.sessions.find((s) => s.date === '2026-08-11');
        const friday = plan.sessions.find((s) => s.date === '2026-08-14');
        const saturday = plan.sessions.find((s) => s.date === '2026-08-15');

        expect(tuesday.fulfilledOnBlockedDay).toBe(true);
        expect(tuesday.flexNote).toMatch(/already logged/i);
        expect(friday.plannedStimulus).toBe('rest');
        expect(friday.relocatedFromDate).toBeFalsy();
        expect(saturday.plannedStimulus === 'rest' || saturday.plannedStimulus === 'endurance').toBe(true);
    });

    it('toggleUnavailableDate clears persisted session matches', () => {
        writeCoachWeekState('2026-08-10', {
            sessionMatches: {
                '2026-08-13': {
                    activityId: 'ride-1',
                    activityDate: '2026-08-10',
                    matchedStimulus: 'sweetspot',
                },
            },
        });

        toggleUnavailableDate('2026-08-10', '2026-08-11');
        const state = readCoachWeekState('2026-08-10');
        expect(state.sessionMatches).toEqual({});
    });

    it('buildProjectedWeek2Plan marks only calendar today, not week-2 Monday', () => {
        const week1 = buildFluidWeekPlan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-05',
        });

        const week2 = buildProjectedWeek2Plan({
            activities: [],
            userSettings: { weeklyHoursTarget: 5, ftp: 250 },
            week1Plan: week1,
            coachContext: { athlete: { ftp: 250 }, fitness: { tsb: 0 } },
            referenceYmd: '2026-08-05',
        });

        expect(week2.mondayYmd).toBe('2026-08-10');
        const week2Monday = week2.sessions.find((s) => s.date === '2026-08-10');
        const week1Wednesday = week1.sessions.find((s) => s.date === '2026-08-05');
        expect(week1Wednesday.isToday).toBe(true);
        expect(week2Monday.isToday).toBe(false);
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

    it('keeps week 1 state when editing week 2', () => {
        writeCoachWeekState('2026-08-03', { completedDates: ['2026-08-04'] });
        writeCoachWeekState('2026-08-10', { unavailableDates: ['2026-08-12'] });
        expect(readCoachWeekState('2026-08-03').completedDates).toEqual(['2026-08-04']);
        expect(readCoachWeekState('2026-08-10').unavailableDates).toEqual(['2026-08-12']);
    });

    it('toggles available dates and clears blocked status', () => {
        toggleUnavailableDate('2026-08-03', '2026-08-04');
        toggleAvailableDate('2026-08-03', '2026-08-04');
        const state = readCoachWeekState('2026-08-03');
        expect(state.availableDates).toEqual(['2026-08-04']);
        expect(state.unavailableDates).toEqual([]);
    });
});
