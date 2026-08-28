import React from 'react';
import { RefreshCw, Sparkles, Ban, Bike, Flame, Mountain } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { COACH_WEEK_VIEW_MODES } from '../../utils/coach/coachWeekCalendar';
import { computeCtlWeekOverWeekDelta } from '../../utils/coach/coachWeekCtlDelta';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { computeClimbingReadiness } from '../../utils/climbingReadiness';
import { resolveEffectiveProfileFtp } from '../../utils/profileFtp';
import {
    buildWeekDayTssMap,
    tssBubbleSizePx,
} from '../../utils/coach/coachWeekCalendarTss';
import {
    computeWeekTssProjection,
    computeWeekPlannedHours,
    planHoursExceedBudget,
} from '../../utils/coach/fluidWeekStats';
import FluidWeekSessionCard from './FluidWeekSessionCard';
import FluidWeekCalendar from './FluidWeekCalendar';
import CollapsibleCoachNote from './CollapsibleCoachNote';

export default function FluidWeekPanel({
    title,
    weekPlan,
    expandedDate,
    onToggleExpand,
    onToggleDone,
    onSwapRecovery,
    onMoveToToday,
    onUndoMove,
    onToggleUnavailable,
    onToggleAvailable,
    onClearAvailability,
    expandKeyPrefix = '',
    isPreview = false,
    compact = false,
    className = '',
    viewMode = COACH_WEEK_VIEW_MODES.LIST,
    activities = [],
    weeklyHours = 5,
    referenceYmd = todayYmd(),
    userSettings = null,
    compactCalendar = false,
    alignHorizon = false,
    showClimbingHint = true,
}) {
    const ctlDelta = React.useMemo(
        () => computeCtlWeekOverWeekDelta(activities, weekPlan.mondayYmd, referenceYmd),
        [activities, weekPlan.mondayYmd, referenceYmd],
    );

    const stats = React.useMemo(() => {
        const planned = weekPlan.sessions.filter((s) => s.plannedStimulus !== 'rest' && !s.isUnavailable).length;
        const done = weekPlan.sessions.filter(
            (s) => s.completed && s.plannedStimulus !== 'rest' && !s.isUnavailable,
        ).length;
        return { planned, done };
    }, [weekPlan.sessions]);

    const dayTssMap = React.useMemo(
        () => buildWeekDayTssMap(weekPlan, activities, weeklyHours),
        [weekPlan, activities, weeklyHours],
    );

    const tssProjection = React.useMemo(
        () => computeWeekTssProjection(weekPlan, activities, weeklyHours),
        [weekPlan, activities, weeklyHours],
    );

    const plannedHoursStats = React.useMemo(
        () => computeWeekPlannedHours(weekPlan, weeklyHours),
        [weekPlan, weeklyHours],
    );

    const hoursExceedBudget = React.useMemo(
        () => planHoursExceedBudget(plannedHoursStats.plannedHours, weeklyHours),
        [plannedHoursStats.plannedHours, weeklyHours],
    );

    const maxDayTss = React.useMemo(() => {
        const values = Object.values(dayTssMap);
        return values.length ? Math.max(...values) : 0;
    }, [dayTssMap]);

    const climbingReadinessHint = React.useMemo(() => {
        if (!showClimbingHint || !activities?.length) return null;
        const ftp = resolveEffectiveProfileFtp(userSettings || {}, activities).ftp || 0;
        const referenceDate = new Date(`${referenceYmd}T12:00:00`);
        const readiness = computeClimbingReadiness({
            activities,
            ftp,
            referenceDate,
            terrainProfile: userSettings?.terrainProfile,
        });
        if (readiness.composite >= 65) return null;
        if (readiness.scores?.elevation >= 60 && readiness.composite >= 55) return null;
        return readiness.hints?.[0] || readiness.badge?.label || null;
    }, [activities, userSettings, referenceYmd]);

    const progressFill = weekPlan.compliancePct > 100 ? 'bg-cdborder/70' : 'bg-cdaccent/70';

    const dateRange = `${formatDateDDMMYYYY(weekPlan.mondayYmd)} – ${formatDateDDMMYYYY(weekPlan.sundayYmd)}`;
    const metaParts = [
        weekPlan.phaseLabel,
        weekPlan.plannedSkeletonTss > 0 ? `~${weekPlan.plannedSkeletonTss} TSS` : null,
    ].filter(Boolean);

    const noteSlotClass = alignHorizon ? 'min-h-[28px]' : '';
    const headerClass = alignHorizon ? 'min-h-[96px]' : '';
    const ctlRowClass = alignHorizon ? 'min-h-[14px]' : '';
    const clearRowClass = alignHorizon ? 'min-h-[18px]' : '';
    const dayRowMinClass = alignHorizon && !compact
        ? 'min-h-[58px]'
        : '';

    return (
        <section className={`flex flex-col min-h-0 ${className}`}>
            <header className={`mb-3 ${headerClass}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <h4 className={`font-bold text-cdtext truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                {title}
                            </h4>
                            {isPreview && (
                                <span className="text-[8px] font-bold uppercase tracking-wide text-cdmuted shrink-0">
                                    Preview
                                </span>
                            )}
                        </div>
                        <p className={`text-cdmuted truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                            {dateRange}
                            {metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
                        </p>
                        <p
                            className={`text-cdmuted tabular-nums leading-snug ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] mt-0.5'}`}
                            title="Logged TSS from rides · projected if you finish remaining sessions (excl. missed/blocked) · weekly target · planned moving time vs hours budget"
                        >
                            Logged {tssProjection.loggedTss}
                            {' · '}
                            Projected {tssProjection.projectedTss}
                            {' · '}
                            Target {tssProjection.targetTss}
                            {' · '}
                            ~{plannedHoursStats.plannedHours} h planned / {weeklyHours} h budget
                        </p>
                        {hoursExceedBudget && (
                            <p className={`text-cdmuted leading-snug ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] mt-0.5'}`}>
                                Plan hours exceed weekly budget — TSS target driven by event goal.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0 tabular-nums">
                        <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-cdtext ${compact ? 'text-xs' : 'text-sm'}`}>
                                {weekPlan.actualTss}
                                <span className="text-cdmuted font-normal text-[10px]">/{weekPlan.targetTss}</span>
                            </span>
                            <div
                                className={`rounded-full bg-cdborder/30 overflow-hidden ${compact ? 'w-10 h-0.5' : 'w-14 h-1'}`}
                                title={`${weekPlan.compliancePct}% of weekly target`}
                            >
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                                    style={{ width: `${Math.min(100, weekPlan.compliancePct)}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-cdmuted" title="Sessions done">
                                <Bike size={9} className="inline -mt-px mr-0.5 text-cdmuted" aria-hidden />
                                {stats.done}/{stats.planned}
                            </span>
                            <span className="text-[9px] text-cdmuted" title="Hard sessions">
                                <Flame size={9} className="inline -mt-px mr-0.5 text-cdmuted" aria-hidden />
                                {weekPlan.hardSessions}
                            </span>
                        </div>
                        <span className={`text-cdmuted ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
                            Proj. {tssProjection.projectedTss} TSS
                        </span>
                    </div>
                </div>

                <div className={ctlRowClass}>
                    {ctlDelta && !compact && (
                        <p className="text-[9px] font-semibold tabular-nums mt-0.5 text-cdmuted">
                            CTL {ctlDelta.delta > 0 ? '+' : ''}{ctlDelta.delta} vs last week
                        </p>
                    )}
                </div>
            </header>

            <div className={alignHorizon ? 'min-h-[92px] mb-1' : 'mb-0'}>
                <div className={noteSlotClass}>
                    {weekPlan.availabilityNote && (
                        <CollapsibleCoachNote
                            text={weekPlan.availabilityNote}
                            icon={Ban}
                            expandLabel="Details"
                            tone="warn"
                            maxSummaryLen={compact ? 72 : 96}
                        />
                    )}
                </div>

                <div className={noteSlotClass}>
                    {weekPlan.rebalanceNote && (
                        <CollapsibleCoachNote
                            text={weekPlan.rebalanceNote}
                            icon={RefreshCw}
                            expandLabel="Why?"
                            tone="muted"
                            maxSummaryLen={compact ? 72 : 96}
                        />
                    )}
                </div>

                <div className={noteSlotClass}>
                    {climbingReadinessHint && (
                        <CollapsibleCoachNote
                            text={climbingReadinessHint}
                            icon={Mountain}
                            expandLabel="Climbing tip"
                            tone="muted"
                            maxSummaryLen={80}
                        />
                    )}
                </div>
            </div>

            <div className={`mb-1 flex justify-end ${clearRowClass}`}>
                {(weekPlan.hasAvailabilityBlocks || weekPlan.hasExplicitAvailability) && onClearAvailability ? (
                    <button
                        type="button"
                        onClick={onClearAvailability}
                        className="text-[9px] text-cdmuted hover:text-cdtext underline"
                    >
                        Clear availability
                    </button>
                ) : null}
            </div>

            {viewMode === COACH_WEEK_VIEW_MODES.CALENDAR ? (
                <div className="flex-1 overflow-y-auto max-h-[min(70vh,480px)] pr-0.5 pt-1">
                    <FluidWeekCalendar
                        weekPlan={weekPlan}
                        expandedDate={expandedDate}
                        onToggleExpand={onToggleExpand}
                        onToggleDone={onToggleDone}
                        onSwapRecovery={onSwapRecovery}
                        onMoveToToday={onMoveToToday}
                        onUndoMove={onUndoMove}
                        onToggleUnavailable={onToggleUnavailable}
                        onToggleAvailable={onToggleAvailable}
                        expandKeyPrefix={expandKeyPrefix}
                        activities={activities}
                        weeklyHours={weeklyHours}
                        compactBubble={compactCalendar || compact}
                        compact={compact}
                    />
                </div>
            ) : (
                <div
                    data-testid="week-day-list"
                    className={`flex-1 overflow-y-auto max-h-[min(70vh,480px)] pr-0.5 flex flex-col ${
                        alignHorizon ? 'gap-2' : compact ? 'gap-2' : 'gap-2.5'
                    }`}
                >
                    {weekPlan.sessions.map((session) => {
                        const expandKey = `${expandKeyPrefix}${session.date}`;
                        const isExpanded = expandedDate === expandKey;
                        const dayTss = dayTssMap[session.date] || 0;
                        const bubbleSize = tssBubbleSizePx(dayTss, maxDayTss, {
                            minPx: compact ? 4 : 6,
                            maxPx: compact ? 12 : 16,
                        });
                        const rowClass = !isExpanded ? dayRowMinClass : '';
                        return (
                            <div
                                key={session.date}
                                data-testid={`day-row-${session.date}`}
                                className={['flex flex-col w-full min-w-0 shrink-0', rowClass].filter(Boolean).join(' ')}
                            >
                                <FluidWeekSessionCard
                                    session={session}
                                    dayTss={dayTss}
                                    tssBubbleSizePx={bubbleSize}
                                    expanded={isExpanded}
                                    onToggleExpand={() => onToggleExpand(expandKey)}
                                    onToggleDone={() => onToggleDone(session.date)}
                                    onSwapRecovery={() => onSwapRecovery(session.date)}
                                    onMoveToToday={() => onMoveToToday(session.movedFromDate || session.date)}
                                    onUndoMove={() => onUndoMove(session.movedFromDate || session.date)}
                                    onToggleUnavailable={() => onToggleUnavailable(session.date)}
                                    onToggleAvailable={() => onToggleAvailable(session.date)}
                                    compact={compact}
                                    alignRow={alignHorizon}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export function FluidWeekSyncNote({ isSignedIn }) {
    return (
        <p className="text-[10px] text-cdmuted mb-2 flex items-start gap-1">
            <Sparkles size={10} className="shrink-0 mt-0.5 text-cdmuted" aria-hidden />
            {isSignedIn
                ? 'Blocked days and moves sync when signed in.'
                : 'Sign in to sync blocked days across devices.'}
        </p>
    );
}
