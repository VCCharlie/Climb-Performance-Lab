import React from 'react';
import { RefreshCw, Sparkles, Ban, TrendingUp, Bike, Flame } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import FluidWeekSessionCard from './FluidWeekSessionCard';

function StatPill({ icon: Icon, label }) {
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cdborder/25 text-cdmuted">
            <Icon size={10} className="text-cdaccent shrink-0" />
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
    className = '',
}) {
    const stats = React.useMemo(() => {
        const planned = weekPlan.sessions.filter((s) => s.plannedStimulus !== 'rest' && !s.isUnavailable).length;
        const done = weekPlan.sessions.filter(
            (s) => s.completed && s.plannedStimulus !== 'rest' && !s.isUnavailable,
        ).length;
        return { planned, done };
    }, [weekPlan.sessions]);

    const progressColor = weekPlan.compliancePct > 115
        ? 'bg-orange-400'
        : weekPlan.compliancePct > 100
            ? 'bg-yellow-400'
            : 'bg-cdaccent';

    return (
        <section className={`flex flex-col min-h-0 ${className}`}>
            <header className="mb-3">
                <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-cdtext">{title}</h4>
                    <div className="text-right tabular-nums">
                        <span className="text-lg font-bold text-cdtext">{weekPlan.actualTss}</span>
                        <span className="text-cdmuted text-sm"> / {weekPlan.targetTss}</span>
                        <span className="text-[9px] text-cdmuted uppercase block">TSS</span>
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
                <p className="text-[11px] text-cdaccent mb-2 flex items-start gap-1.5 bg-cdaccent/10 rounded-md px-2 py-1.5">
                    <RefreshCw size={11} className="shrink-0 mt-0.5" />
                    {weekPlan.rebalanceNote}
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

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[min(70vh,520px)] pr-0.5">
                {weekPlan.sessions.map((session) => {
                    const expandKey = `${expandKeyPrefix}${session.date}`;
                    return (
                        <FluidWeekSessionCard
                            key={session.date}
                            session={session}
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
