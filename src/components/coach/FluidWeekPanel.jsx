import React from 'react';
import { RefreshCw, Sparkles, Ban, TrendingUp, Bike, Flame, Mountain } from 'lucide-react';
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
import FluidWeekSessionCard from './FluidWeekSessionCard';
import FluidWeekCalendar from './FluidWeekCalendar';

function StatPill({ icon: IconGlyph, label }) {
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cdborder/25 text-cdmuted">
            <IconGlyph size={10} className="text-cdaccent shrink-0" />
            {label}
        </span>
    );
}

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
    className = '',
    viewMode = COACH_WEEK_VIEW_MODES.LIST,
    activities = [],
    weeklyHours = 5,
    referenceYmd = todayYmd(),
    userSettings = null,
    compactCalendar = false,
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

    const maxDayTss = React.useMemo(() => {
        const values = Object.values(dayTssMap);
        return values.length ? Math.max(...values) : 0;
    }, [dayTssMap]);

    const climbingReadinessHint = React.useMemo(() => {
        if (!activities?.length) return null;
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

    const progressColor = weekPlan.compliancePct > 115
        ? 'bg-orange-400'
        : weekPlan.compliancePct > 100
            ? 'bg-cdprimary'
            : 'bg-cdaccent';

    return (
        <section className={`flex flex-col min-h-0 ${className}`}>
            <header className="mb-3">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold text-cdtext">{title}</h4>
                        {isPreview && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-cdmuted">
                                Preview
                            </span>
                        )}
                    </div>
                    <div className="text-right tabular-nums">
                        <span className="text-lg font-bold text-cdtext">{weekPlan.actualTss}</span>
                        <span className="text-cdmuted text-sm"> / {weekPlan.targetTss}</span>
                        <span className="text-[9px] text-cdmuted uppercase block">TSS</span>
                        {ctlDelta && (
                            <span
                                className={`text-[9px] font-bold tabular-nums block mt-0.5 ${
                                    ctlDelta.delta > 0 ? 'text-emerald-400' : ctlDelta.delta < 0 ? 'text-orange-400' : 'text-cdmuted'
                                }`}
                            >
                                CTL {ctlDelta.delta > 0 ? '+' : ''}{ctlDelta.delta} vs last week
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-[11px] text-cdmuted mt-0.5">
                    {formatDateDDMMYYYY(weekPlan.mondayYmd)} – {formatDateDDMMYYYY(weekPlan.sundayYmd)}
                    {weekPlan.phaseLabel ? ` · ${weekPlan.phaseLabel}` : ''}
                    {weekPlan.plannedSkeletonTss > 0 && (
                        <>
                            {' · '}
                            <span title="Estimated TSS if you complete all planned sessions">
                                ~{weekPlan.plannedSkeletonTss} TSS planned
                            </span>
                        </>
                    )}
                </p>
            </header>

            <div className="flex flex-wrap gap-1.5 mb-2">
                <StatPill icon={TrendingUp} label={`${weekPlan.compliancePct}%`} />
                <StatPill icon={Bike} label={`${stats.done}/${stats.planned}`} />
                <StatPill icon={Flame} label={`${weekPlan.hardSessions} hard`} />
            </div>

            <div className="h-1.5 rounded-full bg-cdborder/40 overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${Math.min(100, weekPlan.compliancePct)}%` }}
                />
            </div>

            {weekPlan.availabilityNote && (
                <p className="text-[11px] text-orange-300 mb-2 flex items-start gap-1.5 bg-orange-500/10 rounded-md px-2 py-1.5">
                    <Ban size={11} className="shrink-0 mt-0.5" />
                    {weekPlan.availabilityNote}
                </p>
            )}

            {weekPlan.rebalanceNote && (
                <div className="text-[11px] text-cdaccent mb-2 flex items-start gap-1.5 bg-cdaccent/10 rounded-md px-2 py-1.5 leading-relaxed">
                    <RefreshCw size={11} className="shrink-0 mt-0.5" aria-hidden />
                    <p className="min-w-0">{weekPlan.rebalanceNote}</p>
                </div>
            )}

            {climbingReadinessHint && (
                <p className="text-[11px] text-cdmuted mb-2 flex items-start gap-1.5 bg-cdborder/20 rounded-md px-2 py-1.5 leading-relaxed">
                    <Mountain size={11} className="shrink-0 mt-0.5 text-cdaccent" aria-hidden />
                    <span>
                        <span className="font-semibold text-cdtext">Climbing readiness: </span>
                        {climbingReadinessHint}
                    </span>
                </p>
            )}

            {(weekPlan.hasAvailabilityBlocks || weekPlan.hasExplicitAvailability) && onClearAvailability && (
                <div className="mb-2 flex justify-end">
                    <button
                        type="button"
                        onClick={onClearAvailability}
                        className="text-[10px] text-cdmuted hover:text-cdtext underline"
                    >
                        Clear availability
                    </button>
                </div>
            )}

            {viewMode === COACH_WEEK_VIEW_MODES.CALENDAR ? (
                <div className="flex-1 overflow-y-auto overflow-x-visible max-h-[min(70vh,520px)] pr-0.5 pt-1">
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
                        compactBubble={compactCalendar}
                    />
                </div>
            ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[min(70vh,520px)] pr-0.5">
                    {weekPlan.sessions.map((session) => {
                        const expandKey = `${expandKeyPrefix}${session.date}`;
                        const dayTss = dayTssMap[session.date] || 0;
                        const bubbleSize = tssBubbleSizePx(dayTss, maxDayTss, { minPx: 6, maxPx: 16 });
                        return (
                            <FluidWeekSessionCard
                                key={session.date}
                                session={session}
                                dayTss={dayTss}
                                tssBubbleSizePx={bubbleSize}
                                expanded={expandedDate === expandKey}
                                onToggleExpand={() => onToggleExpand(expandKey)}
                                onToggleDone={() => onToggleDone(session.date)}
                                onSwapRecovery={() => onSwapRecovery(session.date)}
                                onMoveToToday={() => onMoveToToday(session.movedFromDate || session.date)}
                                onUndoMove={() => onUndoMove(session.movedFromDate || session.date)}
                                onToggleUnavailable={() => onToggleUnavailable(session.date)}
                                onToggleAvailable={() => onToggleAvailable(session.date)}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export function FluidWeekSyncNote({ isSignedIn }) {
    return (
        <p className="text-[11px] text-cdmuted mb-3 flex items-start gap-1.5">
            <Sparkles size={12} className="shrink-0 mt-0.5 text-cdaccent" />
            {isSignedIn
                ? 'Blocked days and moves sync when signed in. Sessions reschedule to open days.'
                : 'Sign in to sync blocked days across devices.'}
        </p>
    );
}
