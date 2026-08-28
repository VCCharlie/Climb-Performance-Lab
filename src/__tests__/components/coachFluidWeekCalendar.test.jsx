import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import CoachFluidWeekPlan from '../../components/coach/CoachFluidWeekPlan';
import FluidWeekPanel from '../../components/coach/FluidWeekPanel';
import FluidWeekSessionCard from '../../components/coach/FluidWeekSessionCard';
import { COACH_WEEK_VIEW_STORAGE_KEY } from '../../utils/coach/coachWeekCalendar';
import { buildFluidWorkout } from '../../utils/coach/fluidWorkoutTemplates';

function buildMockWeekPlan(withFluidWorkout = false) {
    const thresholdWorkout = withFluidWorkout ? buildFluidWorkout('threshold', { ftp: 250 }) : null;
    const sessions = [
        { date: '2026-08-03', day: 'Monday', stimulus: 'endurance', plannedStimulus: 'endurance', workoutName: 'Z2 endurance', completed: false, isToday: false, isPast: true },
        { date: '2026-08-04', day: 'Tuesday', stimulus: 'rest', plannedStimulus: 'rest', workoutName: 'Rest', completed: false, isToday: false, isPast: true },
        { date: '2026-08-05', day: 'Wednesday', stimulus: 'sweetspot', plannedStimulus: 'sweetspot', workoutName: 'Sweetspot blocks', completed: true, isToday: false, isPast: true },
        {
            date: '2026-08-06',
            day: 'Thursday',
            stimulus: 'threshold',
            plannedStimulus: 'threshold',
            workoutName: 'Threshold intervals',
            fluidWorkout: thresholdWorkout,
            completed: false,
            isToday: true,
            isPast: false,
        },
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

    it('shows TSS bubble and label in list view day rows', () => {
        render(
            <CoachFluidWeekPlan
                activities={[{ date: '2026-08-05', load: 85 }]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={buildMockWeekPlan()}
            />,
        );

        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('85 TSS')).toBeInTheDocument();
    });

    it('expands list view workout details when chevron is clicked', () => {
        render(
            <CoachFluidWeekPlan
                activities={[]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={buildMockWeekPlan(true)}
            />,
        );

        const expandBtn = screen.getByRole('button', { name: 'Show workout details' });
        expect(screen.queryByText('Main set')).not.toBeInTheDocument();

        fireEvent.click(expandBtn);

        expect(screen.getByRole('button', { name: 'Hide workout details' })).toBeInTheDocument();
        expect(screen.getByText('Main set')).toBeInTheDocument();
        expect(screen.getByText(/Warm-up/i)).toBeInTheDocument();
    });
});

describe('FluidWeekPanel horizon list expand', () => {
    const noop = () => {};

    it('does not use fixed grid rows and shows expanded details in alignHorizon mode', () => {
        const weekPlan = buildMockWeekPlan(true);
        const { container } = render(
            <FluidWeekPanel
                title="This week"
                weekPlan={weekPlan}
                expandedDate="2026-08-06"
                onToggleExpand={noop}
                onToggleDone={noop}
                onSwapRecovery={noop}
                onMoveToToday={noop}
                onUndoMove={noop}
                onToggleUnavailable={noop}
                onToggleAvailable={noop}
                alignHorizon
            />,
        );

        const listScroller = container.querySelector('.overflow-y-auto');
        expect(listScroller?.className).not.toMatch(/grid-rows-7/);
        expect(listScroller?.className).toMatch(/flex flex-col/);

        const expandedRow = screen.getByText('Threshold intervals').closest('div.min-h-\\[58px\\]');
        expect(expandedRow?.className).toMatch(/relative z-10/);

        const card = screen.getByText('Threshold intervals').closest('article');
        expect(card?.className).toMatch(/overflow-visible/);
        expect(card?.className).not.toMatch(/\bh-full\b/);

        expect(within(card).getByText('Main set')).toBeInTheDocument();
    });
});

describe('FluidWeekSessionCard mobile layout', () => {
    const noop = () => {};

    it('keeps zone and TSS on one nowrap meta row', () => {
        render(
            <FluidWeekSessionCard
                session={{
                    date: '2026-08-28',
                    day: 'Friday',
                    stimulus: 'endurance',
                    plannedStimulus: 'endurance',
                    workoutName: 'Coastal/Polder Endurance Ride · 1×60m',
                    completed: false,
                    isToday: true,
                    isPast: false,
                }}
                dayTss={70}
                tssBubbleSizePx={8}
                expanded={false}
                onToggleExpand={noop}
                onToggleDone={noop}
                onSwapRecovery={noop}
                onMoveToToday={noop}
                onUndoMove={noop}
                onToggleUnavailable={noop}
                onToggleAvailable={noop}
            />,
        );

        const metaRow = screen.getByTestId('day-meta-row');
        expect(metaRow.className).toMatch(/flex-nowrap/);
        expect(within(metaRow).getByText('70 TSS')).toBeInTheDocument();
        expect(within(metaRow).getByText('Z2')).toBeInTheDocument();
        expect(within(metaRow).getByText('Today')).toBeInTheDocument();
    });

    it('hides blocked flex note text and redundant rest title on mobile classes', () => {
        const { container } = render(
            <FluidWeekSessionCard
                session={{
                    date: '2026-08-27',
                    day: 'Wednesday',
                    stimulus: 'rest',
                    plannedStimulus: 'rest',
                    workoutName: 'Rest',
                    flexNote: 'Blocked — no training this day.',
                    isUnavailable: true,
                    completed: false,
                    isToday: false,
                    isPast: false,
                }}
                dayTss={0}
                expanded={false}
                onToggleExpand={noop}
                onToggleDone={noop}
                onSwapRecovery={noop}
                onMoveToToday={noop}
                onUndoMove={noop}
                onToggleUnavailable={noop}
                onToggleAvailable={noop}
            />,
        );

        expect(screen.getByText('Blocked')).toBeInTheDocument();
        expect(screen.queryByText('Blocked — no training this day.')).not.toBeInTheDocument();

        const restTitle = container.querySelector('p.truncate');
        expect(restTitle?.className).toMatch(/hidden md:block/);
    });

    it('truncates workout title and hides block summary until md breakpoint', () => {
        const workout = buildFluidWorkout('sweetspot', { ftp: 250 });
        const { container } = render(
            <FluidWeekSessionCard
                session={{
                    date: '2026-08-26',
                    day: 'Thursday',
                    stimulus: 'sweetspot',
                    plannedStimulus: 'sweetspot',
                    workoutName: 'Polder Power: Sweetspot Blocks',
                    fluidWorkout: workout,
                    completed: false,
                    isToday: false,
                    isPast: true,
                }}
                dayTss={78}
                expanded={false}
                onToggleExpand={noop}
                onToggleDone={noop}
                onSwapRecovery={noop}
                onMoveToToday={noop}
                onUndoMove={noop}
                onToggleUnavailable={noop}
                onToggleAvailable={noop}
            />,
        );

        const title = container.querySelector('p.truncate.whitespace-nowrap');
        expect(title).toBeTruthy();
        expect(title?.textContent).toContain('Polder Power: Sweetspot Blocks');
        const blockSummarySpan = title?.querySelector('span.hidden.md\\:inline');
        expect(blockSummarySpan).toBeTruthy();
        expect(blockSummarySpan?.textContent).toMatch(/3×8m/);
    });
});
