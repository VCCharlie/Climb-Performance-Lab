import React from 'react';
import {
    CheckCircle2,
    Circle,
    RefreshCw,
    Heart,
    ArrowRight,
    Undo2,
    Sparkles,
    Ban,
    CircleCheck,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { getStimulusStyle } from './coachStimulusStyles';
import FluidWorkoutExpandable from './FluidWorkoutExpandable';

function StatusBadge({ children, className = '' }) {
    return (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${className}`}>
            {children}
        </span>
    );
}

function ActionButton({ onClick, title, children, active = false, activeClass = '' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`p-1.5 rounded-md border transition-colors ${
                active
                    ? activeClass
                    : 'border-transparent text-cdmuted hover:text-cdtext hover:bg-cdborder/30'
            }`}
        >
            {children}
        </button>
    );
}

export default function FluidWeekSessionCard({
    session,
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
    const hasActions = session.fluidWorkout
        || canMarkUnavailable
        || canMarkAvailable
        || canMoveToToday
        || canUndoMove
        || (isActionable && session.stimulus !== 'recovery' && session.stimulus !== 'completed');

    return (
        <article
            className={[
                'rounded-lg border-l-[3px] overflow-hidden transition-colors',
                styles.border,
                session.isToday ? 'ring-1 ring-cdaccent/50' : 'border border-cdborder/40',
                session.completed ? 'opacity-75' : '',
                missed ? 'opacity-80' : '',
                styles.rowBg || 'bg-cdborder/5',
            ].join(' ')}
        >
            <div className="px-2.5 py-2">
                <div className="flex items-start gap-2">
                    <button
                        type="button"
                        onClick={() => isActionable && onToggleDone()}
                        disabled={isRest}
                        className={`shrink-0 mt-0.5 ${isRest ? 'opacity-20 cursor-default' : 'hover:opacity-80'}`}
                        aria-label={session.completed ? 'Mark incomplete' : 'Mark done'}
                    >
                        {session.completed ? (
                            <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                            <Circle size={18} className={session.isToday ? 'text-cdaccent' : 'text-cdmuted'} />
                        )}
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className={`text-sm font-semibold ${session.completed ? 'text-cdmuted line-through' : 'text-cdtext'}`}>
                                {session.day}
                            </span>
                            <span className="text-[10px] text-cdmuted tabular-nums">
                                {formatDateDDMMYYYY(session.date)}
                            </span>
                            {session.isToday && (
                                <StatusBadge className="bg-cdaccent text-slate-900">Today</StatusBadge>
                            )}
                            {missed && (
                                <StatusBadge className="bg-cdborder/80 text-cdmuted">Missed</StatusBadge>
                            )}
                            {isBlocked && (
                                <StatusBadge className="bg-red-500/15 text-red-300">Blocked</StatusBadge>
                            )}
                            {isExplicitlyAvailable && (
                                <StatusBadge className="bg-emerald-500/15 text-emerald-300">Open</StatusBadge>
                            )}
                            {(session.movedFromDate || session.relocatedFromDate) && (
                                <StatusBadge className="bg-blue-500/15 text-blue-300">Moved</StatusBadge>
                            )}
                            <StatusBadge className={styles.badge}>{styles.label}</StatusBadge>
                        </div>

                        <p className={`text-sm leading-snug mt-0.5 ${session.completed ? 'text-cdmuted' : 'text-cdtext'}`}>
                            {session.workoutName}
                        </p>

                        {session.note && (
                            <p className="text-[11px] text-cdaccent mt-1 flex items-start gap-1">
                                <RefreshCw size={10} className="shrink-0 mt-0.5" />
                                {session.note}
                            </p>
                        )}

                        {session.flexNote && (
                            <p className="text-[11px] text-blue-300/90 mt-1 flex items-start gap-1">
                                <Sparkles size={10} className="shrink-0 mt-0.5" />
                                {session.flexNote}
                            </p>
                        )}

                        {session.fluidWorkout?.mainSet?.blocks?.length > 0 && !expanded && (
                            <p className="text-[11px] text-cdmuted mt-1 truncate">
                                {session.fluidWorkout.mainSet.blocks.map((b) =>
                                    `${b.reps}× ${b.workMin} min`
                                ).join(' · ')}
                            </p>
                        )}

                        {expanded && session.fluidWorkout && (
                            <div className="mt-2">
                                <FluidWorkoutExpandable workout={session.fluidWorkout} />
                            </div>
                        )}
                    </div>
                </div>

                {hasActions && (
                    <div className="flex items-center justify-end gap-0.5 mt-1.5 pt-1.5 border-t border-cdborder/30">
                        {session.fluidWorkout && !isRest && (
                            <ActionButton
                                onClick={onToggleExpand}
                                title={expanded ? 'Hide workout details' : 'Show workout details'}
                            >
                                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </ActionButton>
                        )}
                        {canMarkUnavailable && (
                            <ActionButton
                                onClick={onToggleUnavailable}
                                title={isBlocked ? 'Mark as available' : 'Block this day'}
                                active={isBlocked}
                                activeClass="border-orange-500/40 text-orange-300 bg-orange-500/10"
                            >
                                <Ban size={14} />
                            </ActionButton>
                        )}
                        {canMarkAvailable && (
                            <ActionButton
                                onClick={onToggleAvailable}
                                title={isExplicitlyAvailable ? 'Remove open day' : 'Mark as open for training'}
                                active={isExplicitlyAvailable}
                                activeClass="border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                            >
                                <CircleCheck size={14} />
                            </ActionButton>
                        )}
                        {canMoveToToday && (
                            <ActionButton onClick={onMoveToToday} title="Move to today">
                                <ArrowRight size={14} />
                            </ActionButton>
                        )}
                        {canUndoMove && (
                            <ActionButton onClick={onUndoMove} title="Undo move">
                                <Undo2 size={14} />
                            </ActionButton>
                        )}
                        {isActionable && session.stimulus !== 'recovery' && session.stimulus !== 'completed' && (
                            <ActionButton onClick={onSwapRecovery} title="Swap to recovery">
                                <Heart size={14} />
                            </ActionButton>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
