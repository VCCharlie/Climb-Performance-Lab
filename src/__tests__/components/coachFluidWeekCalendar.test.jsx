import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import CoachFluidWeekPlan from '../../components/coach/CoachFluidWeekPlan';
import FluidWeekPanel from '../../components/coach/FluidWeekPanel';
import FluidWeekSessionCard from '../../components/coach/FluidWeekSessionCard';
import { COACH_WEEK_VIEW_STORAGE_KEY } from '../../utils/coach/coachWeekCalendar';
import { buildFluidWorkout } from '../../utils/coach/fluidWorkoutTemplates';

function buildMockWeekPlan(withFluidWorkout = false, mondayYmd = '2026-08-03') {
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
        mondayYmd,
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

describe('CoachFluidWeekPlan horizon layout', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            store: {},
            getItem(k) { return this.store[k] ?? null; },
            setItem(k, v) { this.store[k] = v; },
            removeItem(k) { delete this.store[k]; },
        });
    });

    it('uses fixed-width week columns with horizontal scroll when multiple weeks shown', () => {
        const week1 = buildMockWeekPlan(false, '2026-08-03');
        const week2 = buildMockWeekPlan(false, '2026-08-10');
        week2.sundayYmd = '2026-08-16';
        week2.isHorizonPreview = true;

        const { container } = render(
            <CoachFluidWeekPlan
                activities={[]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={week1}
                horizonWeeks={[week1, week2]}
                showHorizon
                horizonWeekCount={2}
            />,
        );

        const scroller = container.querySelector('[data-testid="horizon-week-scroll"]');
        expect(scroller?.className).toMatch(/overflow-x-auto/);
        expect(scroller?.className).not.toMatch(/overflow-x-hidden/);

        const columns = scroller?.querySelectorAll('section');
        expect(columns?.length).toBe(2);
        columns?.forEach((col) => {
            expect(col.className).toMatch(/w-\[280px\]/);
            expect(col.className).toMatch(/min-w-\[280px\]/);
            expect(col.className).not.toMatch(/\bw-full\b/);
        });
    });

    it('uses full width for single week column', () => {
        const week1 = buildMockWeekPlan();

        const { container } = render(
            <CoachFluidWeekPlan
                activities={[]}
                userSettings={{ weeklyHoursTarget: 5, ftp: 250 }}
                coachContext={{ athlete: { ftp: 250 }, fitness: { tsb: 0 } }}
                weekPlan={week1}
            />,
        );

        const scroller = container.querySelector('[data-testid="horizon-week-scroll"]');
        expect(scroller?.className).not.toMatch(/overflow-x-auto/);

        const column = scroller?.querySelector('section');
        expect(column?.className).toMatch(/\bw-full\b/);
        expect(column?.className).not.toMatch(/w-\[280px\]/);
    });
});

describe('FluidWeekPanel horizon list expand', () => {
    const noop = () => {};

    it('uses flex column without z-index stacking when expanded in alignHorizon mode', () => {
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

        const listScroller = container.querySelector('[data-testid="week-day-list"]');
        expect(listScroller?.className).not.toMatch(/grid-rows-7/);
        expect(listScroller?.className).toMatch(/flex flex-col/);

        const thuRow = container.querySelector('[data-testid="day-row-2026-08-06"]');
        expect(thuRow?.className).not.toMatch(/z-10/);
        expect(thuRow?.className).not.toMatch(/\bh-full\b/);
        expect(thuRow?.className).toMatch(/flex flex-col/);

        const expandPanel = within(thuRow).getByTestId('day-expand-panel');
        expect(expandPanel).toBeInTheDocument();
        expect(within(expandPanel).getByText('Main set')).toBeInTheDocument();
    });

    it('keeps following days below expanded session in list view', () => {
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
            />,
        );

        const rows = container.querySelectorAll('[data-testid^="day-row-"]');
        expect(rows.length).toBe(7);

        const thuRow = container.querySelector('[data-testid="day-row-2026-08-06"]');
        const friRow = container.querySelector('[data-testid="day-row-2026-08-07"]');

        expect(thuRow?.contains(screen.getByText('Main set'))).toBe(true);
        expect(friRow?.textContent).toMatch(/Friday|Fri/i);
        expect(friRow?.contains(screen.getByText('Main set'))).toBe(false);

        const thuIndex = Array.from(rows).indexOf(thuRow);
        const friIndex = Array.from(rows).indexOf(friRow);
        expect(friIndex).toBe(thuIndex + 1);
    });
});

describe('FluidWeekSessionCard accordion layout', () => {
    const noop = () => {};

    it('renders expand panel as sibling block after session header', () => {
        const workout = buildFluidWorkout('threshold', { ftp: 250 });
        render(
            <FluidWeekSessionCard
                session={{
                    date: '2026-08-06',
                    day: 'Thursday',
                    stimulus: 'threshold',
                    plannedStimulus: 'threshold',
                    workoutName: 'Threshold intervals',
                    fluidWorkout: workout,
                    completed: false,
                    isToday: true,
                    isPast: false,
                }}
                dayTss={90}
                expanded
                onToggleExpand={noop}
                onToggleDone={noop}
                onSwapRecovery={noop}
                onMoveToToday={noop}
                onUndoMove={noop}
                onToggleUnavailable={noop}
                onToggleAvailable={noop}
            />,
        );

        const card = screen.getByTestId('day-session-card');
        expect(card.className).toMatch(/flex flex-col/);
        expect(card.className).not.toMatch(/relative/);
        expect(card.className).not.toMatch(/overflow-hidden/);

        const expandPanel = screen.getByTestId('day-expand-panel');
        const headerBlock = card.firstElementChild;
        expect(headerBlock?.contains(screen.getByText('Threshold intervals'))).toBe(true);
        expect(headerBlock?.contains(expandPanel)).toBe(false);
        expect(card.children.length).toBe(2);
        expect(card.children[1]).toBe(expandPanel);
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
