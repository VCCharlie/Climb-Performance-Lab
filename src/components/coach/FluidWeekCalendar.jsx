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
    const bubbleSize = tssBubbleSizePx(dayTss, maxDayTss);

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
                'flex flex-col items-stretch min-h-[88px] rounded-lg border p-1.5 text-left transition-colors',
                isEmpty ? 'border-cdborder/20 bg-cdborder/5 opacity-40 cursor-default' : 'cursor-pointer hover:bg-cdborder/15',
                selected ? 'ring-2 ring-cdaccent border-cdaccent/50' : 'border-cdborder/40',
                isToday && !selected ? 'ring-1 ring-cdaccent/40' : '',
                styles.rowBg || 'bg-cdborder/5',
                isCompleted ? 'opacity-80' : '',
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-sm font-bold tabular-nums ${isToday ? 'text-cdaccent' : 'text-cdtext'}`}>
                    {cell.dayOfMonth ?? '—'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {bubbleSize > 0 && (
                        <span
                            className="rounded-full bg-cdprimary/70 border border-cdprimary/40 shrink-0"
                            style={{ width: bubbleSize, height: bubbleSize }}
                            title={`${Math.round(dayTss)} TSS`}
                            aria-hidden
                        />
                    )}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} aria-hidden />
                </div>
            </div>

            <p className={`text-[10px] leading-tight font-medium line-clamp-2 flex-1 ${isCompleted ? 'text-cdmuted line-through' : 'text-cdtext'}`}>
                {label}
            </p>

            {dayTss > 0 && (
                <p className="text-[9px] text-cdmuted tabular-nums font-mono mt-0.5">
                    {Math.round(dayTss)} TSS
                </p>
            )}

            <div className="flex items-center justify-end gap-0.5 mt-1 min-h-[14px]">
                {isBlocked && <Ban size={11} className="text-red-300" aria-label="Blocked" />}
                {isCompleted && <CheckCircle2 size={11} className="text-emerald-400" aria-label="Completed" />}
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
        <div className="flex flex-col gap-3">
            <div
                className="grid grid-cols-7 gap-1 sm:gap-1.5"
                role="grid"
                aria-label="Week training calendar"
            >
                {cells.map((cell) => (
                    <div key={cell.weekdayLabel} className="flex flex-col min-w-0" role="columnheader">
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
                        />
                    </div>
                ))}
            </div>

            {selectedSession && (
                <FluidWeekSessionCard
                    session={selectedSession}
                    expanded
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
                    Tap a day to view details and actions — bubble size reflects daily TSS
                </p>
            )}
        </div>
    );
}
