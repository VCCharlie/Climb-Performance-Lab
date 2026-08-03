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
} from 'lucide-react';
import { buildFluidWeekPlan } from '../../utils/coach/coachWeekPlan';
import {
    toggleSessionComplete,
    setSessionOverride,
    moveSessionToToday,
    clearSessionMove,
    dispatchCoachWeekUpdated,
    COACH_WEEK_UPDATED_EVENT,
} from '../../utils/coach/coachWeekState';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { getStimulusStyle } from './coachStimulusStyles';
import FluidWorkoutExpandable from './FluidWorkoutExpandable';

const CoachFluidWeekPlan = ({ activities, userSettings, coachContext }) => {
    const [weekRevision, setWeekRevision] = useState(0);
    const [expandedDate, setExpandedDate] = useState(null);
    const today = todayYmd();

    useEffect(() => {
        const onUpdate = () => setWeekRevision((n) => n + 1);
        window.addEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(COACH_WEEK_UPDATED_EVENT, onUpdate);
    }, []);

    const weekPlan = useMemo(
        () => buildFluidWeekPlan({ activities, userSettings, coachContext, referenceYmd: today }),
        [activities, userSettings, coachContext, weekRevision, today],
    );

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

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden">
            <div className="p-5 border-b border-cdborder bg-gradient-to-br from-cdaccent/5 to-transparent">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            <CalendarDays size={20} className="text-cdaccent" />
                            This week — fluid plan
                        </h3>
                        <p className="text-xs text-cdmuted mt-1">
                            {formatDateDDMMYYYY(weekPlan.mondayYmd)} – {formatDateDDMMYYYY(weekPlan.sundayYmd)}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-cdtext tabular-nums">
                            {weekPlan.actualTss}
                            <span className="text-cdmuted text-base font-normal"> / {weekPlan.targetTss}</span>
                        </div>
                        <div className="text-[10px] text-cdmuted uppercase tracking-wide">TSS this week</div>
                    </div>
                </div>

                <p className="text-xs text-cdmuted mt-3 flex items-start gap-2">
                    <Sparkles size={13} className="shrink-0 mt-0.5 text-cdaccent" />
                    {weekPlan.flexWeekNote}
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

                {weekPlan.rebalanceNote && (
                    <p className="text-xs text-cdaccent mt-3 flex items-start gap-2 bg-cdaccent/10 rounded-lg px-3 py-2">
                        <RefreshCw size={13} className="shrink-0 mt-0.5" />
                        {weekPlan.rebalanceNote}
                    </p>
                )}
            </div>

            <div className="p-3 space-y-2">
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
                    />
                ))}
            </div>
        </div>
    );
};

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
}) {
    const styles = getStimulusStyle(session.stimulus);
    const isRest = session.stimulus === 'rest' && !session.movedToDate;
    const isActionable = !isRest && !session.isPast;
    const missed = session.isPast && !session.completed
        && session.plannedStimulus !== 'rest'
        && !session.movedToDate;

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
