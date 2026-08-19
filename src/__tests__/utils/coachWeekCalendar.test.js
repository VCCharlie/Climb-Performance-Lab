import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    buildWeekCalendarCells,
    calendarCellLabel,
    dayOfMonthFromYmd,
    readCoachWeekViewMode,
    writeCoachWeekViewMode,
    COACH_WEEK_VIEW_MODES,
    COACH_WEEK_VIEW_STORAGE_KEY,
    WEEKDAY_HEADERS,
} from '../../utils/coach/coachWeekCalendar';

describe('coachWeekCalendar', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            store: {},
            getItem(k) { return this.store[k] ?? null; },
            setItem(k, v) { this.store[k] = v; },
            removeItem(k) { delete this.store[k]; },
        });
    });

    it('dayOfMonthFromYmd parses ISO dates', () => {
        expect(dayOfMonthFromYmd('2026-08-06')).toBe(6);
        expect(dayOfMonthFromYmd('invalid')).toBeNull();
        expect(dayOfMonthFromYmd(null)).toBeNull();
    });

    it('buildWeekCalendarCells returns seven Mon–Sun cells', () => {
        const weekPlan = {
            sessions: [
                { date: '2026-08-03', day: 'Monday', stimulus: 'endurance' },
                { date: '2026-08-04', day: 'Tuesday', stimulus: 'rest' },
                { date: '2026-08-05', day: 'Wednesday', stimulus: 'sweetspot' },
                { date: '2026-08-06', day: 'Thursday', stimulus: 'threshold' },
                { date: '2026-08-07', day: 'Friday', stimulus: 'endurance' },
                { date: '2026-08-08', day: 'Saturday', stimulus: 'vo2' },
                { date: '2026-08-09', day: 'Sunday', stimulus: 'rest' },
            ],
        };

        const cells = buildWeekCalendarCells(weekPlan);
        expect(cells).toHaveLength(7);
        expect(cells[0].weekdayLabel).toBe('Mon');
        expect(cells[0].dayOfMonth).toBe(3);
        expect(cells[6].weekdayLabel).toBe('Sun');
        expect(cells[6].session.stimulus).toBe('rest');
    });

    it('buildWeekCalendarCells pads empty plan with null sessions', () => {
        const cells = buildWeekCalendarCells({ sessions: [] });
        expect(cells).toHaveLength(WEEKDAY_HEADERS.length);
        expect(cells.every((c) => c.session === null)).toBe(true);
    });

    it('calendarCellLabel prefers blocked, done, rest, then workout name', () => {
        expect(calendarCellLabel({ isUnavailable: true })).toBe('Blocked');
        expect(calendarCellLabel({ completed: true })).toBe('Done');
        expect(calendarCellLabel({ stimulus: 'rest', plannedStimulus: 'rest' })).toBe('Rest');
        expect(calendarCellLabel({ workoutName: 'Sweetspot' })).toBe('Sweetspot');
        expect(calendarCellLabel({ workoutName: 'Very long workout name here' })).toBe('Very long wo…');
        expect(calendarCellLabel({ stimulus: 'threshold' })).toBe('threshold');
    });

    it('readCoachWeekViewMode defaults to list', () => {
        expect(readCoachWeekViewMode()).toBe(COACH_WEEK_VIEW_MODES.LIST);
    });

    it('writeCoachWeekViewMode persists calendar mode', () => {
        writeCoachWeekViewMode(COACH_WEEK_VIEW_MODES.CALENDAR);
        expect(localStorage.getItem(COACH_WEEK_VIEW_STORAGE_KEY)).toBe('calendar');
        expect(readCoachWeekViewMode()).toBe(COACH_WEEK_VIEW_MODES.CALENDAR);
    });

    it('writeCoachWeekViewMode coerces unknown values to list', () => {
        writeCoachWeekViewMode('grid');
        expect(localStorage.getItem(COACH_WEEK_VIEW_STORAGE_KEY)).toBe('list');
    });
});
