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

function StatusBadge({ children, className = '', compact = false }) {
    return (
        <span className={`font-bold uppercase tracking-wide rounded ${compact ? 'text-[8px] px-1 py-px' : 'text-[9px] px-1.5 py-0.5'} ${className}`}>
            {children}
        </span>
    );
}

function ActionButton({ onClick, title, children, active = false, activeClass = '', compact = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`rounded border transition-colors ${compact ? 'p-0.5' : 'p-1'} ${
                active
                    ? activeClass
                    : 'border-transparent text-cdmuted hover:text-cdtext hover:bg-cdborder/30'
            }`}
        >
            {children}
        </button>
    );
}

const ICON_SIZE = { normal: 14, compact: 12 };
const CHECK_SIZE = { normal: 16, compact: 14 };

export default function FluidWeekSessionCard({
    session,
    expanded,
    dayTss = 0,
    tssBubbleSizePx: bubbleSizePx = 0,
    onToggleExpand,
    onToggleDone,
    onSwapRecovery,
    onMoveToToday,
    onUndoMove,
    onToggleUnavailable,
    onToggleAvailable,
    compact = false,
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

    const iconSize = compact ? ICON_SIZE.compact : ICON_SIZE.normal;
    const checkSize = compact ? CHECK_SIZE.compact : CHECK_SIZE.normal;
    const blockSummary = session.fluidWorkout?.mainSet?.blocks?.length > 0 && !expanded
        ? session.fluidWorkout.mainSet.blocks.map((b) => `${b.reps}×${b.workMin}m`).join(' · ')
        : '';
    const secondaryNote = session.note || session.flexNote || null;
    const noteIcon = session.note ? RefreshCw : Sparkles;

    return (
        <article
            className={[
                'rounded-md border-l-[3px] overflow-hidden transition-colors',
                styles.border,
                session.isToday ? 'ring-1 ring-cdaccent/40' : 'border border-cdborder/30',
                session.completed ? 'opacity-75' : '',
                missed ? 'opacity-80' : '',
                styles.rowBg || 'bg-cdborder/5',
            ].join(' ')}
        >
            <div className={compact ? 'px-1.5 py-1' : 'px-2 py-1'}>
                <div className="flex items-start gap-1">
                    <button
                        type="button"
                        onClick={() => isActionable && onToggleDone()}
                        disabled={isRest}
                        className={`shrink-0 ${isRest ? 'opacity-20 cursor-default' : 'hover:opacity-80'}`}
                        aria-label={session.completed ? 'Mark incomplete' : 'Mark done'}
                    >
                        {session.completed ? (
                            <CheckCircle2 size={checkSize} className="text-emerald-400" />
                        ) : (
                            <Circle size={checkSize} className={session.isToday ? 'text-cdaccent' : 'text-cdmuted'} />
                        )}
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                            <span className={`font-semibold shrink-0 ${compact ? 'text-[10px]' : 'text-[11px]'} ${session.completed ? 'text-cdmuted line-through' : 'text-cdtext'}`}>
                                {compact ? session.day.slice(0, 3) : session.day}
                            </span>
                            {!compact && (
                                <span className="text-[10px] text-cdmuted tabular-nums shrink-0">
                                    {formatDateDDMMYYYY(session.date)}
                                </span>
                            )}
                            {session.isToday && (
                                <StatusBadge compact={compact} className="bg-cdaccent text-slate-900">Today</StatusBadge>
                            )}
                            {missed && (
                                <StatusBadge compact={compact} className="bg-cdborder/80 text-cdmuted">Missed</StatusBadge>
                            )}
                            {isBlocked && (
                                <StatusBadge compact={compact} className="bg-red-500/15 text-red-300">Blocked</StatusBadge>
                            )}
                            {isExplicitlyAvailable && (
                                <StatusBadge compact={compact} className="bg-emerald-500/15 text-emerald-300">Open</StatusBadge>
                            )}
                            {(session.movedFromDate || session.relocatedFromDate) && (
                                <StatusBadge compact={compact} className="bg-blue-500/15 text-blue-300">Moved</StatusBadge>
                            )}
                            <StatusBadge compact={compact} className={styles.badge}>{styles.label}</StatusBadge>
                            {dayTss > 0 && (
                                <span
                                    className="inline-flex items-center gap-0.5 text-[9px] text-cdmuted tabular-nums shrink-0"
                                    title={`${Math.round(dayTss)} TSS`}
                                >
                                    {bubbleSizePx > 0 && (
                                        <span
                                            className="rounded-full bg-cdprimary/75 border border-cdprimary/50 shrink-0"
                                            style={{ width: bubbleSizePx, height: bubbleSizePx }}
                                            aria-hidden
                                        />
                                    )}
                                    {Math.round(dayTss)} TSS
                                </span>
                            )}

                            {hasActions && (
                                <div className="ml-auto flex items-center shrink-0 -mr-0.5">
                                    {session.fluidWorkout && !isRest && (
                                        <ActionButton
                                            compact={compact}
                                            onClick={onToggleExpand}
                                            title={expanded ? 'Hide workout details' : 'Show workout details'}
                                        >
                                            {expanded ? <ChevronUp size={iconSize} /> : <ChevronDown size={iconSize} />}
                                        </ActionButton>
                                    )}
                                    {canMarkUnavailable && (
                                        <ActionButton
                                            compact={compact}
                                            onClick={onToggleUnavailable}
                                            title={isBlocked ? 'Mark as available' : 'Block this day'}
                                            active={isBlocked}
                                            activeClass="border-orange-500/40 text-orange-300 bg-orange-500/10"
                                        >
                                            <Ban size={iconSize} />
                                        </ActionButton>
                                    )}
                                    {canMarkAvailable && (
                                        <ActionButton
                                            compact={compact}
                                            onClick={onToggleAvailable}
                                            title={isExplicitlyAvailable ? 'Remove open day' : 'Mark as open for training'}
                                            active={isExplicitlyAvailable}
                                            activeClass="border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                        >
                                            <CircleCheck size={iconSize} />
                                        </ActionButton>
                                    )}
                                    {canMoveToToday && (
                                        <ActionButton compact={compact} onClick={onMoveToToday} title="Move to today">
                                            <ArrowRight size={iconSize} />
                                        </ActionButton>
                                    )}
                                    {canUndoMove && (
                                        <ActionButton compact={compact} onClick={onUndoMove} title="Undo move">
                                            <Undo2 size={iconSize} />
                                        </ActionButton>
                                    )}
                                    {isActionable && session.stimulus !== 'recovery' && session.stimulus !== 'completed' && (
                                        <ActionButton compact={compact} onClick={onSwapRecovery} title="Swap to recovery">
                                            <Heart size={iconSize} />
                                        </ActionButton>
                                    )}
                                </div>
                            )}
                        </div>

                        <p className={`truncate leading-tight ${compact ? 'text-[10px] mt-px' : 'text-[11px]'} ${session.completed ? 'text-cdmuted' : 'text-cdtext'}`}>
                            {session.workoutName}
                            {blockSummary ? (
                                <span className="text-cdmuted"> · {blockSummary}</span>
                            ) : null}
                        </p>

                        {secondaryNote && !expanded && (
                            <p className={`truncate leading-tight mt-px flex items-center gap-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'} text-cdaccent`}>
                                {React.createElement(noteIcon, { size: 9, className: 'shrink-0', 'aria-hidden': true })}
                                {secondaryNote}
                            </p>
                        )}

                        {expanded && session.fluidWorkout && (
                            <div className="mt-1.5">
                                <FluidWorkoutExpandable workout={session.fluidWorkout} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
