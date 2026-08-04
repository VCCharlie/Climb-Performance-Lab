import React, { useMemo, useState, useEffect } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    Circle,
    RefreshCw,
    Heart,
    Bike,
    Flame,
    TrendingUp,
    ArrowRight,
    Undo2,
    Sparkles,
    Ban,
    CircleCheck,
} from 'lucide-react';
import { buildFluidWeekPlan, buildPreviewWeekPlan } from '../../utils/coach/coachWeekPlan';
import {
    toggleSessionComplete,
    setSessionOverride,
    moveSessionToToday,
    clearSessionMove,
    toggleUnavailableDate,
    clearUnavailableDates,
    toggleAvailableDate,
    clearAvailableDates,
    mergeSessionMatches,
    dispatchCoachWeekUpdated,
    COACH_WEEK_UPDATED_EVENT,
} from '../../utils/coach/coachWeekState';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { addDaysToYmd } from '../../utils/dashboardVolumeTotals';
import { projectWeekEndTsb } from '../../utils/coach/coachFitnessForecast';
import { getStimulusStyle } from './coachStimulusStyles';
import FluidWorkoutExpandable from './FluidWorkoutExpandable';
import CollapsibleSection from '../ui/CollapsibleSection';

const CoachFluidWeekPlan = ({
    activities,
    userSettings,
    coachContext,
    isSignedIn = false,
    weekPlan: weekPlanProp,
    showNextWeek = false,
    onToggleNextWeek,
    week2Sessions: week2SessionsProp,
}) => {
    const [weekRevision, setWeekRevision] = useState(0);
    const [expandedDate, setExpandedDate] = useState(null);
    const today = todayYmd();

    useEffect(() => {
        const onUpdate = () => setWeekRevision((n) => n + 1);
        window.addEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
    }, []);

    const weekPlan = useMemo(
        () => weekPlanProp || buildFluidWeekPlan({ activities, userSettings, coachContext, referenceYmd: today }),
        [weekPlanProp, activities, userSettings, coachContext, weekRevision, today],
    );

    const week2Sessions = useMemo(() => {
        if (week2SessionsProp) return week2SessionsProp;
        if (!showNextWeek) return [];
        const nextMonday = addDaysToYmd(weekPlan.mondayYmd, 7);
        const endTsb = projectWeekEndTsb({
            activities,
            sessions: weekPlan.sessions,
            weeklyHours: Number(userSettings?.weeklyHoursTarget) || 5,
            referenceYmd: today,
        });
        return buildPreviewWeekPlan({
            userSettings,
            coachContext,
            weekStartYmd: nextMonday,
            projectedTsb: endTsb,
        });
    }, [week2SessionsProp, showNextWeek, weekPlan, activities, userSettings, coachContext, today]);

    useEffect(() => {
        const matches = {};
        weekPlan.sessions.forEach((s) => {
            if (s.matchedOnDate) {
                matches[s.date] = {
                    activityId: s.matchedActivityId || null,
                    activityDate: s.matchedOnDate,
                    matchedStimulus: s.matchedStimulus,
                };
            }
        });
        if (Object.keys(matches).length > 0) {
            mergeSessionMatches(weekPlan.mondayYmd, matches);
        }
    }, [weekPlan.mondayYmd, weekPlan.sessions]);

    const stats = useMemo(() => {
        const planned = weekPlan.sessions.filter((s) => s.plannedStimulus !== 'rest').length;
        const done = weekPlan.sessions.filter((s) => s.completed).length;
        return { planned, done };
    }, [weekPlan.sessions]);

    const progressColor = weekPlan.compliancePct > 115
        ? 'bg-orange-400'
        : weekPlan.compliancePct > 100
            ? 'bg-yellow-400'
            : 'bg-cdaccent';

    const handleToggleDone = (dateYmd) => {
        toggleSessionComplete(weekPlan.mondayYmd, dateYmd);
        dispatchCoachWeekUpdated();
    };

    const handleSwapRecovery = (dateYmd) => {
        setSessionOverride(weekPlan.mondayYmd, dateYmd, 'recovery');
        dispatchCoachWeekUpdated();
    };

    const handleMoveToToday = (fromDateYmd) => {
        moveSessionToToday(weekPlan.mondayYmd, fromDateYmd, today);
        dispatchCoachWeekUpdated();
    };

    const handleUndoMove = (fromDateYmd) => {
        clearSessionMove(weekPlan.mondayYmd, fromDateYmd);
        dispatchCoachWeekUpdated();
    };

    const handleToggleUnavailable = (dateYmd) => {
        toggleUnavailableDate(weekPlan.mondayYmd, dateYmd);
        dispatchCoachWeekUpdated();
    };

    const handleToggleAvailable = (dateYmd) => {
        toggleAvailableDate(weekPlan.mondayYmd, dateYmd);
        dispatchCoachWeekUpdated();
    };

    const handleClearAvailability = () => {
        clearUnavailableDates(weekPlan.mondayYmd);
        clearAvailableDates(weekPlan.mondayYmd);
        dispatchCoachWeekUpdated();
    };

    return (
        <CollapsibleSection
            title="This week — fluid plan"
            subtitle={`${formatDateDDMMYYYY(weekPlan.mondayYmd)} – ${formatDateDDMMYYYY(weekPlan.sundayYmd)} · ${weekPlan.actualTss}/${weekPlan.targetTss} TSS`}
            icon={CalendarDays}
            defaultExpanded
            headerExtra={onToggleNextWeek ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleNextWeek();
                    }}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                        showNextWeek
                            ? 'border-cdaccent bg-cdaccent/15 text-cdaccent'
                            : 'border-cdborder text-cdmuted hover:text-cdtext'
                    }`}
                >
                    + Week 2
                </button>
            ) : null}
        >
            <div className="space-y-4 -mt-1">
                <div className="rounded-xl border border-cdborder/50 bg-gradient-to-br from-cdaccent/5 to-transparent p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="text-right ml-auto">
                            <div className="text-2xl font-bold text-cdtext tabular-nums">
                                {weekPlan.actualTss}
                                <span className="text-cdmuted text-base font-normal"> / {weekPlan.targetTss}</span>
                            </div>
                            <div className="text-[10px] text-cdmuted uppercase tracking-wide">TSS this week</div>
                        </div>
                    </div>

                    <p className="text-xs text-cdmuted mt-3 flex items-start gap-2">
                    <Sparkles size={13} className="shrink-0 mt-0.5 text-cdaccent" />
                    {isSignedIn
                        ? 'Blocked days and moves sync across devices when signed in. Sessions reschedule to your open days.'
                        : 'Sign in to sync blocked days across mobile and desktop. Sessions reschedule to your open days.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <StatPill icon={TrendingUp} label={`${weekPlan.compliancePct}% target`} />
                    <StatPill icon={Bike} label={`${stats.done}/${stats.planned} sessions`} />
                    <StatPill icon={Flame} label={`${weekPlan.hardSessions} hard`} />
                    <StatPill icon={Bike} label={`${weekPlan.rideCount} rides logged`} />
                </div>

                <div className="mt-3 h-2.5 rounded-full bg-cdborder/50 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(100, weekPlan.compliancePct)}%` }}
                    />
                </div>

                {weekPlan.availabilityNote && (
                    <p className="text-xs text-orange-300 mt-3 flex items-start gap-2 bg-orange-500/10 rounded-lg px-3 py-2">
                        <Ban size={13} className="shrink-0 mt-0.5" />
                        {weekPlan.availabilityNote}
                    </p>
                )}

                {(weekPlan.hasAvailabilityBlocks || weekPlan.hasExplicitAvailability) && (
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={handleClearAvailability}
                            className="text-xs text-cdmuted hover:text-cdtext underline"
                        >
                            Clear availability overrides
                        </button>
                    </div>
                )}

                {weekPlan.rebalanceNote && (
                    <p className="text-xs text-cdaccent mt-3 flex items-start gap-2 bg-cdaccent/10 rounded-lg px-3 py-2">
                        <RefreshCw size={13} className="shrink-0 mt-0.5" />
                        {weekPlan.rebalanceNote}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                {weekPlan.sessions.map((session) => (
                    <WeekSessionRow
                        key={session.date}
                        session={session}
                        today={today}
                        expanded={expandedDate === session.date}
                        onToggleExpand={() =>
                            setExpandedDate((d) => (d === session.date ? null : session.date))
                        }
                        onToggleDone={() => handleToggleDone(session.date)}
                        onSwapRecovery={() => handleSwapRecovery(session.date)}
                        onMoveToToday={() => handleMoveToToday(session.movedFromDate || session.date)}
                        onUndoMove={() => handleUndoMove(session.movedFromDate || session.date)}
                        onToggleUnavailable={() => handleToggleUnavailable(session.date)}
                        onToggleAvailable={() => handleToggleAvailable(session.date)}
                    />
                ))}
            </div>

            {showNextWeek && week2Sessions.length > 0 && (
                <div className="pt-4 border-t border-cdborder space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h4 className="text-sm font-bold text-cdtext">Next week (preview)</h4>
                            <p className="text-xs text-cdmuted">
                                {formatDateDDMMYYYY(week2Sessions[0].date)} – {formatDateDDMMYYYY(week2Sessions[6].date)}
                                {' '}· projected from week 1 completion
                            </p>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-cdmuted border border-cdborder px-2 py-1 rounded-full">
                            Preview
                        </span>
                    </div>
                    <div className="space-y-2">
                        {week2Sessions.map((session) => (
                            <PreviewSessionRow key={session.date} session={session} />
                        ))}
                    </div>
                </div>
            )}
            </div>
        </CollapsibleSection>
    );
};

function PreviewSessionRow({ session }) {
    const styles = getStimulusStyle(session.stimulus);
    const isRest = session.stimulus === 'rest';

    return (
        <div className={`rounded-xl border-l-4 border border-cdborder/40 ${styles.border} ${styles.rowBg || 'bg-cdborder/10'} opacity-90`}>
            <div className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-[72px]">
                    <div className="text-xs font-bold text-cdtext">{session.day}</div>
                    <div className="text-[10px] text-cdmuted">{formatDateDDMMYYYY(session.date)}</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-cdtext">{session.workoutName}</div>
                    {session.note ? (
                        <p className="text-xs text-cdmuted mt-0.5">{session.note}</p>
                    ) : null}
                </div>
                {!isRest && session.estimatedTss ? (
                    <span className="text-[10px] font-bold text-cdmuted tabular-nums">
                        ~{session.estimatedTss} TSS
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function StatPill({ icon: Icon, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full bg-cdborder/30 text-cdtext border border-cdborder/50">
            <Icon size={11} className="text-cdaccent shrink-0" />
            {label}
        </span>
    );
}

function WeekSessionRow({
    session,
    today,
    expanded,
    onToggleExpand,
    onToggleDone,
    onSwapRecovery,
    onMoveToToday,
    onUndoMove,
    onToggleUnavailable,
    onToggleAvailable,
}) {
    const styles = getStimulusStyle(session.stimulus);
    const isBlocked = Boolean(session.isUnavailable);
    const isExplicitlyAvailable = Boolean(session.isExplicitlyAvailable);
    const isLoggedRestRide = session.plannedStimulus === 'rest' && session.sameDayComplete;
    const isRest = (session.stimulus === 'rest' && !session.movedToDate && !isLoggedRestRide) || isBlocked;
    const isOpenRestDay = session.plannedStimulus === 'rest'
        && !isBlocked
        && !session.movedFromDate
        && !session.relocatedFromDate;
    const isActionable = !isRest && !session.isPast;
    const missed = session.isPast && !session.completed
        && session.plannedStimulus !== 'rest'
        && !session.movedToDate
        && !isBlocked;

    const canMarkUnavailable = !session.isPast && !isOpenRestDay;
    const canMarkAvailable = !session.isPast && isOpenRestDay;

    const canMoveToToday = !session.isToday
        && !session.isPast
        && !session.completed
        && session.plannedStimulus !== 'rest'
        && !session.movedFromDate;

    const canUndoMove = Boolean(session.movedFromDate || session.movedToDate);

    return (
        <div
            className={[
                'rounded-xl border-l-4 transition-colors',
                styles.border,
                session.isToday ? 'ring-2 ring-cdaccent/40 ring-offset-1 ring-offset-cdsurface' : '',
                session.completed ? 'opacity-80' : '',
                missed ? 'border-dashed opacity-70' : '',
                styles.rowBg || 'bg-cdborder/10',
                'border border-cdborder/50',
            ].join(' ')}
        >
            <div className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => isActionable && onToggleDone()}
                            disabled={isRest}
                            className={`shrink-0 mt-0.5 ${isRest ? 'opacity-25 cursor-default' : 'hover:scale-105 transition-transform'}`}
                            aria-label={session.completed ? 'Mark incomplete' : 'Mark done'}
                        >
                            {session.completed ? (
                                <CheckCircle2 size={22} className="text-emerald-400" />
                            ) : (
                                <Circle size={22} className={session.isToday ? 'text-cdaccent' : 'text-cdmuted'} />
                            )}
                        </button>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-bold text-sm ${session.completed ? 'text-cdmuted line-through' : 'text-cdtext'}`}>
                                    {session.day}
                                </span>
                                <span className="text-[10px] text-cdmuted tabular-nums">
                                    {formatDateDDMMYYYY(session.date)}
                                </span>
                                {session.isToday && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cdaccent text-slate-900">
                                        Today
                                    </span>
                                )}
                                {missed && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cdborder text-cdmuted">
                                        Missed
                                    </span>
                                )}
                                {session.movedFromDate && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                        Moved here
                                    </span>
                                )}
                                {session.movedToDate && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cdborder text-cdmuted">
                                        Rescheduled
                                    </span>
                                )}
                                {session.relocatedFromDate && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                                        Rescheduled here
                                    </span>
                                )}
                                {isBlocked && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                        Blocked
                                    </span>
                                )}
                                {isExplicitlyAvailable && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                        Open for training
                                    </span>
                                )}
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${styles.badge}`}>
                                    {styles.label}
                                </span>
                            </div>

                            <p className={`text-sm mt-1 ${session.completed ? 'text-cdmuted' : 'text-cdtext font-medium'}`}>
                                {session.workoutName}
                            </p>

                            {session.note && (
                                <p className="text-xs text-cdaccent mt-1 flex items-start gap-1.5">
                                    <RefreshCw size={11} className="shrink-0 mt-0.5" />
                                    {session.note}
                                </p>
                            )}

                            {session.flexNote && (
                                <p className="text-xs text-blue-300 mt-1 flex items-start gap-1.5">
                                    <Sparkles size={11} className="shrink-0 mt-0.5" />
                                    {session.flexNote}
                                </p>
                            )}

                            {session.fluidWorkout?.mainSet?.blocks?.length > 0 && !expanded && (
                                <p className="text-xs text-cdmuted mt-1.5">
                                    {session.fluidWorkout.mainSet.blocks.map((b) =>
                                        `${b.reps}× ${b.workMin} min`
                                    ).join(' · ')}
                                    {session.fluidWorkout.mainSet.blocks[0]?.wattRange
                                        ? ` · ${session.fluidWorkout.mainSet.blocks[0].wattRange}`
                                        : ''}
                                </p>
                            )}

                            {expanded && session.fluidWorkout && (
                                <FluidWorkoutExpandable workout={session.fluidWorkout} />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                        {session.fluidWorkout && !isRest && (
                            <button
                                type="button"
                                onClick={onToggleExpand}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50"
                            >
                                {expanded ? 'Hide details' : 'Show details'}
                            </button>
                        )}
                        {canMarkUnavailable && (
                            <button
                                type="button"
                                onClick={onToggleUnavailable}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                                    isBlocked
                                        ? 'border-orange-500/40 text-orange-300 bg-orange-500/10'
                                        : 'border-cdborder text-cdmuted hover:text-orange-300 hover:border-orange-500/40'
                                }`}
                            >
                                <Ban size={12} />
                                {isBlocked ? 'Can train' : "Can't train"}
                            </button>
                        )}
                        {canMarkAvailable && (
                            <button
                                type="button"
                                onClick={onToggleAvailable}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                                    isExplicitlyAvailable
                                        ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                                        : 'border-cdborder text-cdmuted hover:text-emerald-300 hover:border-emerald-500/40'
                                }`}
                            >
                                <CircleCheck size={12} />
                                {isExplicitlyAvailable ? 'Not open' : 'Available to train'}
                            </button>
                        )}
                        {canMoveToToday && (
                            <button
                                type="button"
                                onClick={onMoveToToday}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted hover:text-blue-300 hover:border-blue-500/40 flex items-center gap-1.5"
                            >
                                <ArrowRight size={12} />
                                Move to today
                            </button>
                        )}
                        {canUndoMove && (
                            <button
                                type="button"
                                onClick={onUndoMove}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted hover:text-cdtext hover:border-cdborder flex items-center gap-1.5"
                            >
                                <Undo2 size={12} />
                                Undo move
                            </button>
                        )}
                        {isActionable && session.stimulus !== 'recovery' && session.stimulus !== 'completed' && (
                            <button
                                type="button"
                                onClick={onSwapRecovery}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/40 flex items-center gap-1.5"
                            >
                                <Heart size={12} />
                                Recovery
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CoachFluidWeekPlan;
