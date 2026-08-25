import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CoachFluidWeekPlan from '../../components/coach/CoachFluidWeekPlan';
import { COACH_WEEK_VIEW_STORAGE_KEY } from '../../utils/coach/coachWeekCalendar';

function buildMockWeekPlan() {
    const sessions = [
        { date: '2026-08-03', day: 'Monday', stimulus: 'endurance', plannedStimulus: 'endurance', workoutName: 'Z2 endurance', completed: false, isToday: false, isPast: true },
        { date: '2026-08-04', day: 'Tuesday', stimulus: 'rest', plannedStimulus: 'rest', workoutName: 'Rest', completed: false, isToday: false, isPast: true },
        { date: '2026-08-05', day: 'Wednesday', stimulus: 'sweetspot', plannedStimulus: 'sweetspot', workoutName: 'Sweetspot blocks', completed: true, isToday: false, isPast: true },
        { date: '2026-08-06', day: 'Thursday', stimulus: 'threshold', plannedStimulus: 'threshold', workoutName: 'Threshold intervals', completed: false, isToday: true, isPast: false },
        { date: '2026-08-07', day: 'Friday', stimulus: 'endurance', plannedStimulus: 'endurance', workoutName: 'Easy spin', completed: false, isToday: false, isPast: false },
        { date: '2026-08-08', day: 'Saturday', stimulus: 'vo2', plannedStimulus: 'vo2', workoutName: 'VO2 repeats', completed: false, isToday: false, isPast: false },
        { date: '2026-08-09', day: 'Sunday', stimulus: 'rest', plannedStimulus: 'rest', workoutName: 'Rest', completed: false, isToday: false, isPast: false },
    ];

    return {
        mondayYmd: '2026-08-03',
        sundayYmd: '2026-08-09',
        targetTss: 350,
        actualTss: 120,
        compliancePct: 34,
        hardSessions: 1,
        plannedSkeletonTss: 320,
        phaseLabel: 'Build',
        targetTssSource: 'hours-budget',
        sessions,
        hasAvailabilityBlocks: false,
        hasExplicitAvailability: false,
    };
}

describe('CoachFluidWeekPlan calendar view', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            store: {},
            getItem(k) { return this.store[k] ?? null; },
            setItem(k, v) { this.store[k] = v; },
            removeItem(k) { delete this.store[k]; },
        });
    });

    it('renders list view by default with view toggle', () => {
        render(
            <CoachFluidWeekPlan
                activities={[]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={buildMockWeekPlan()}
            />,
        );

        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText('Monday')).toBeInTheDocument();
        expect(screen.queryByRole('grid', { name: /Week training calendar/i })).not.toBeInTheDocument();
    });

    it('switches to calendar grid and expands a day on click', () => {
        render(
            <CoachFluidWeekPlan
                activities={[]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={buildMockWeekPlan()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));

        expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem(COACH_WEEK_VIEW_STORAGE_KEY)).toBe('calendar');
        expect(screen.getByRole('grid', { name: /Week training calendar/i })).toBeInTheDocument();
        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Sun')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Thu 6,/i }));

        expect(screen.getByText('Threshold intervals')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mark done/i })).toBeInTheDocument();
    });

    it('shows TSS bubbles in calendar grid view', () => {
        const weekPlan = buildMockWeekPlan();
        render(
            <CoachFluidWeekPlan
                activities={[{ date: '2026-08-05', load: 85 }]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={weekPlan}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));

        const wedCell = screen.getByRole('button', { name: /Wed 5,/i });
        expect(wedCell).toBeInTheDocument();
        expect(wedCell.getAttribute('title') || wedCell.textContent).toMatch(/TSS|85/i);
    });
});
