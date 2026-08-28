import React, { useMemo } from 'react';
import { CheckCircle2, Ban } from 'lucide-react';
import {
    buildWeekCalendarCells,
    calendarCellLabel,
} from '../../utils/coach/coachWeekCalendar';
import { getStimulusStyle } from './coachStimulusStyles';
import FluidWeekSessionCard from './FluidWeekSessionCard';
import {
    buildWeekDayTssMap,
    tssBubbleSizePx,
} from '../../utils/coach/coachWeekCalendarTss';

function CalendarDayCell({
    cell,
    selected,
    onSelect,
    dayTss,
    maxDayTss,
    compactBubble = false,
    compact = false,
}) {
    const session = cell.session;
    const styles = getStimulusStyle(session?.stimulus || 'rest');
    const label = calendarCellLabel(session);
    const isBlocked = Boolean(session?.isUnavailable);
    const isToday = Boolean(session?.isToday);
    const isCompleted = Boolean(session?.completed);
    const isMissed = Boolean(
        session?.isPast
        && !session.completed
        && session.plannedStimulus !== 'rest'
        && !session.movedToDate
        && !isBlocked,
    );
    const isEmpty = !session;
    const bubbleSize = tssBubbleSizePx(dayTss, maxDayTss, {
        minPx: compactBubble ? 5 : 6,
        maxPx: compactBubble ? 14 : 18,
    });

    return (
        <button
            type="button"
            onClick={() => session && onSelect(cell.dateYmd)}
            disabled={isEmpty}
            aria-pressed={selected}
            aria-label={session
                ? `${cell.weekdayLabel} ${cell.dayOfMonth}, ${label}${dayTss > 0 ? `, ${Math.round(dayTss)} TSS` : ''}`
                : `${cell.weekdayLabel}, no session`}
            className={[
                'relative flex flex-col items-stretch rounded-lg border p-1 pb-0.5 text-left transition-colors overflow-visible bg-cdsurface',
                compact ? 'min-h-[72px]' : 'min-h-[92px] sm:min-h-[96px]',
                isEmpty ? 'border-cdborder/20 bg-cdborder/5 opacity-40 cursor-default' : 'cursor-pointer hover:bg-cdborder/10',
                selected ? 'ring-1 ring-cdaccent/40 border-cdborder/60' : 'border-cdborder/40',
                isToday && !selected ? 'ring-1 ring-inset ring-cdaccent/20 border-l-[3px] border-l-cdaccent/40' : '',
                isCompleted ? 'opacity-80' : '',
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className={`font-bold tabular-nums ${compact ? 'text-xs' : 'text-sm'} text-cdtext`}>
                    {cell.dayOfMonth ?? '—'}
                </span>
                <span className={`rounded-full shrink-0 ${styles.dot} ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} aria-hidden />
            </div>

            <p className={`leading-tight font-medium line-clamp-2 flex-1 ${compact ? 'text-[9px] min-h-[1.5rem]' : 'text-[10px] min-h-[2rem]'} ${isCompleted ? 'text-cdmuted line-through' : 'text-cdtext'}`}>
                {label}
            </p>

            <div className="mt-auto flex flex-col items-center justify-end gap-0.5 pt-1 min-h-[28px]">
                {bubbleSize > 0 && (
                    <span
                        className="rounded-full bg-cdborder/50 border border-cdborder shrink-0"
                        style={{ width: bubbleSize, height: bubbleSize }}
                        title={`${Math.round(dayTss)} TSS`}
                        aria-hidden
                    />
                )}
                {dayTss > 0 && (
                    <p className="cd-type-caption tabular-nums leading-none">
                        {Math.round(dayTss)}
                    </p>
                )}
            </div>

            <div className="flex items-center justify-end gap-0.5 mt-0.5 min-h-[12px]">
                {isBlocked && <Ban size={11} className="text-cdmuted" aria-label="Blocked" />}
                {isCompleted && <CheckCircle2 size={11} className="text-cdmuted" aria-label="Completed" />}
                {isMissed && (
                    <span className="text-[8px] font-bold uppercase text-cdmuted">Missed</span>
                )}
            </div>
        </button>
    );
}

export default function FluidWeekCalendar({
    weekPlan,
    expandedDate,
    onToggleExpand,
    onToggleDone,
    onSwapRecovery,
    onMoveToToday,
    onUndoMove,
    onToggleUnavailable,
    onToggleAvailable,
    expandKeyPrefix = '',
    activities = [],
    weeklyHours = 5,
    compactBubble = false,
    compact = false,
}) {
    const cells = useMemo(() => buildWeekCalendarCells(weekPlan), [weekPlan]);

    const dayTssMap = useMemo(
        () => buildWeekDayTssMap(weekPlan, activities, weeklyHours),
        [weekPlan, activities, weeklyHours],
    );

    const maxDayTss = useMemo(() => {
        const values = Object.values(dayTssMap);
        return values.length ? Math.max(...values) : 0;
    }, [dayTssMap]);

    const selectedSession = useMemo(() => {
        if (!expandedDate) return null;
        const dateKey = expandedDate.startsWith(expandKeyPrefix)
            ? expandedDate.slice(expandKeyPrefix.length)
            : expandedDate;
        return weekPlan.sessions?.find((s) => s.date === dateKey) || null;
    }, [expandedDate, expandKeyPrefix, weekPlan.sessions]);

    const handleSelect = (dateYmd) => {
        if (!dateYmd) return;
        const expandKey = `${expandKeyPrefix}${dateYmd}`;
        onToggleExpand(expandKey);
    };

    return (
        <div className="flex flex-col gap-3 overflow-visible">
            <div
                className="grid grid-cols-7 gap-1 sm:gap-1.5 overflow-visible pt-0.5"
                role="grid"
                aria-label="Week training calendar"
            >
                {cells.map((cell) => (
                    <div key={cell.weekdayLabel} className="flex flex-col min-w-0 overflow-visible" role="columnheader">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-cdmuted text-center mb-1">
                            {cell.weekdayLabel}
                        </span>
                        <CalendarDayCell
                            cell={cell}
                            selected={Boolean(
                                cell.dateYmd
                                && expandedDate === `${expandKeyPrefix}${cell.dateYmd}`,
                            )}
                            onSelect={handleSelect}
                            dayTss={cell.dateYmd ? dayTssMap[cell.dateYmd] || 0 : 0}
                            maxDayTss={maxDayTss}
                            compactBubble={compactBubble}
                            compact={compact}
                        />
                    </div>
                ))}
            </div>

            {selectedSession && (
                <FluidWeekSessionCard
                    session={selectedSession}
                    expanded
                    compact={compact}
                    onToggleExpand={() => onToggleExpand(`${expandKeyPrefix}${selectedSession.date}`)}
                    onToggleDone={() => onToggleDone(selectedSession.date)}
                    onSwapRecovery={() => onSwapRecovery(selectedSession.date)}
                    onMoveToToday={() => onMoveToToday(selectedSession.movedFromDate || selectedSession.date)}
                    onUndoMove={() => onUndoMove(selectedSession.movedFromDate || selectedSession.date)}
                    onToggleUnavailable={() => onToggleUnavailable(selectedSession.date)}
                    onToggleAvailable={() => onToggleAvailable(selectedSession.date)}
                />
            )}

            {!expandedDate && (
                <p className="text-[10px] text-cdmuted text-center">
                    Tap a day to view details — bubble size reflects daily TSS
                </p>
            )}
        </div>
    );
}
