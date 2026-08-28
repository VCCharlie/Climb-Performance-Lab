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

function StatusLabel({ children, accent = false, tone = 'default', compact = false, title }) {
    const toneClass = tone === 'missed'
        ? 'text-red-400/70'
        : tone === 'done'
            ? 'text-emerald-500/70'
            : accent
                ? 'text-cdaccent'
                : 'text-cdmuted';

    return (
        <span
            title={title}
            className={`font-semibold uppercase tracking-wide shrink-0 ${
                compact ? 'text-[8px]' : 'text-[9px]'
            } ${toneClass}`}
        >
            {children}
        </span>
    );
}

function ActionButton({ onClick, title, children, active = false, compact = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`rounded border transition-colors text-cdmuted hover:text-cdaccent focus:text-cdaccent ${
                compact ? 'p-0.5' : 'p-1'
            } ${
                active
                    ? 'border-cdborder/60 bg-cdborder/10 text-cdtext'
                    : 'border-transparent hover:bg-cdborder/20 focus:bg-cdborder/20'
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
    alignRow = false,
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
    const zoneBadgeClass = `rounded font-semibold uppercase tracking-wide shrink-0 ${
        compact ? 'text-[8px] px-1 py-px' : 'text-[9px] px-1 py-0.5'
    } ${styles.badge}`;
    const titleRedundantOnMobile = isRest
        || (session.completed && (session.workoutName === 'Done' || session.workoutName === 'Rest'));
    const showWorkoutTitle = Boolean(session.workoutName);
    const hideSecondaryOnMobile = isBlocked;

    const leftAccent = session.isToday
        ? 'border-l-cdaccent'
        : styles.border;

    const headerMinHeightClass = alignRow && !expanded
        ? 'min-h-[52px]'
        : !expanded && !alignRow
            ? 'min-h-[48px] md:min-h-0'
            : '';

    const paddingClass = compact ? 'px-2 py-1.5' : 'px-2.5 py-1.5';

    return (
        <article
            data-testid="day-session-card"
            className={[
                'flex flex-col w-full max-w-full min-w-0 rounded-md border border-cdborder/40 border-l-2 transition-colors',
                session.isToday ? 'bg-cdaccent/8 ring-1 ring-inset ring-cdaccent/30' : 'bg-cdsurface',
                leftAccent,
            ].join(' ')}
        >
            <div className={[paddingClass, headerMinHeightClass, 'overflow-hidden'].filter(Boolean).join(' ')}>
                <div className="flex items-start gap-1.5">
                    <button
                        type="button"
                        onClick={() => isActionable && onToggleDone()}
                        disabled={isRest}
                        className={`shrink-0 text-cdmuted hover:text-cdaccent focus:text-cdaccent ${
                            isRest ? 'opacity-20 cursor-default' : ''
                        }`}
                        aria-label={session.completed ? 'Mark incomplete' : 'Mark done'}
                    >
                        {session.completed ? (
                            <CheckCircle2 size={checkSize} className="text-cdmuted" />
                        ) : (
                            <Circle size={checkSize} />
                        )}
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 items-center">
                            <div
                                className="flex items-center gap-1 min-w-0 flex-nowrap overflow-hidden md:flex-wrap md:overflow-visible"
                                data-testid="day-meta-row"
                            >
                                <span className={`font-semibold shrink-0 uppercase ${compact ? 'text-[10px]' : 'text-[11px]'} ${
                                    session.completed
                                        ? 'text-emerald-500/70 line-through'
                                        : missed
                                            ? 'text-red-400/70'
                                            : session.isToday
                                                ? 'text-cdaccent'
                                                : 'text-cdtext'
                                }`}>
                                    {compact ? session.day.slice(0, 3) : (
                                        <>
                                            <span className="md:hidden">{session.day.slice(0, 3)}</span>
                                            <span className="hidden md:inline">{session.day}</span>
                                        </>
                                    )}
                                </span>
                                {!compact && (
                                    <span className="hidden md:inline text-[10px] text-cdmuted tabular-nums shrink-0">
                                        {formatDateDDMMYYYY(session.date)}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 min-w-0 overflow-hidden flex-nowrap md:overflow-visible">
                                    {session.isToday && (
                                        <StatusLabel compact={compact} accent>Today</StatusLabel>
                                    )}
                                    {session.completed && !session.isToday && (
                                        <StatusLabel compact={compact} tone="done">Done</StatusLabel>
                                    )}
                                    {missed && (
                                        <StatusLabel compact={compact} tone="missed">Missed</StatusLabel>
                                    )}
                                    {isBlocked && (
                                        <StatusLabel compact={compact} title="Blocked — no training this day">
                                            Blocked
                                        </StatusLabel>
                                    )}
                                    {isExplicitlyAvailable && (
                                        <StatusLabel compact={compact}>Open</StatusLabel>
                                    )}
                                    {(session.movedFromDate || session.relocatedFromDate) && (
                                        <StatusLabel compact={compact}>Moved</StatusLabel>
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1 shrink-0 ml-auto md:ml-0">
                                    <span className={zoneBadgeClass} title={styles.label}>
                                        <span className="md:hidden">{styles.mobileLabel || styles.label}</span>
                                        <span className="hidden md:inline">{styles.label}</span>
                                    </span>
                                    {dayTss > 0 && (
                                        <span
                                            className="inline-flex items-center gap-0.5 text-[9px] text-cdmuted tabular-nums shrink-0 whitespace-nowrap"
                                            title={`${Math.round(dayTss)} TSS`}
                                        >
                                            {bubbleSizePx > 0 && (
                                                <span
                                                    className="hidden sm:inline-block rounded-full bg-cdborder/50 border border-cdborder shrink-0"
                                                    style={{ width: bubbleSizePx, height: bubbleSizePx }}
                                                    aria-hidden
                                                />
                                            )}
                                            {Math.round(dayTss)} TSS
                                        </span>
                                    )}
                                </span>
                            </div>

                            {hasActions && (
                                <div className="flex items-center shrink-0 gap-0.5 self-center">
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

                        {showWorkoutTitle && (
                            <p
                                className={[
                                    'truncate leading-snug whitespace-nowrap',
                                    compact ? 'text-[10px] mt-0.5' : 'text-[11px] mt-0.5',
                                    session.completed
                                        ? 'text-emerald-500/70 line-through'
                                        : missed
                                            ? 'text-red-400/70'
                                            : 'text-cdtext',
                                    hasActions ? 'pr-1' : '',
                                    titleRedundantOnMobile ? 'hidden md:block' : '',
                                ].join(' ')}
                                title={session.workoutName}
                            >
                                {session.workoutName}
                                {blockSummary ? (
                                    <span className="hidden md:inline text-cdmuted"> · {blockSummary}</span>
                                ) : null}
                            </p>
                        )}

                        {secondaryNote && !expanded && !hideSecondaryOnMobile && (
                            <>
                                <p className={`hidden md:flex truncate leading-tight mt-px items-center gap-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'} text-cdmuted`}>
                                    {React.createElement(noteIcon, { size: 9, className: 'shrink-0', 'aria-hidden': true })}
                                    {secondaryNote}
                                </p>
                                <span
                                    className="md:hidden inline-flex items-center mt-px text-cdmuted"
                                    title={secondaryNote}
                                    aria-label={secondaryNote}
                                >
                                    {React.createElement(noteIcon, { size: 9, className: 'shrink-0', 'aria-hidden': true })}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {expanded && session.fluidWorkout && (
                <div
                    data-testid="day-expand-panel"
                    className={`${paddingClass} pt-0 w-full max-w-full min-w-0 border-t border-cdborder/30`}
                >
                    <FluidWorkoutExpandable workout={session.fluidWorkout} embedded />
                </div>
            )}
        </article>
    );
}
