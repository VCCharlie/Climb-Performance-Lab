import React, { useMemo } from 'react';
import { Gauge, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { buildWeeklyTssBudgetSummary } from '../../utils/weeklyTssBudget';
import { todayYmd } from '../../utils/coach/coachHelpers';

const STATUS_COPY = {
    'on-track': { label: 'On track', icon: Minus, className: 'text-emerald-400' },
    under: { label: 'Below target', icon: TrendingDown, className: 'text-amber-400' },
    over: { label: 'Above target', icon: TrendingUp, className: 'text-orange-400' },
    'no-target': { label: 'No weekly target', icon: Gauge, className: 'text-cdmuted' },
};

/**
 * Lightweight week TSS budget vs actual (Coach tab).
 */
export default function WeeklyTssBudgetCard({ activities, userSettings, referenceYmd = todayYmd() }) {
    const summary = useMemo(
        () => buildWeeklyTssBudgetSummary({ activities, userSettings, referenceYmd }),
        [activities, userSettings, referenceYmd],
    );

    if (!summary) return null;

    const statusMeta = STATUS_COPY[summary.status] || STATUS_COPY['on-track'];
    const StatusIcon = statusMeta.icon;
    const pct = summary.compliancePct ?? 0;
    const barWidth = summary.targetTss > 0 ? Math.min(100, Math.round((summary.actualTss / summary.targetTss) * 100)) : 0;

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder p-4 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-cdmuted flex items-center gap-1.5">
                        <Gauge size={14} />
                        Weekly load budget
                    </p>
                    <p className="text-sm text-cdmuted mt-1">{summary.weekLabel}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${statusMeta.className}`}>
                    <StatusIcon size={14} />
                    {statusMeta.label}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                    <div className="text-2xl font-bold text-cdtext tabular-nums">
                        {summary.actualTss}
                        <span className="text-base text-cdmuted font-semibold"> / {summary.targetTss || '—'} TSS</span>
                    </div>
                    <p className="text-xs text-cdmuted mt-1">
                        {summary.targetSource === 'event-goal' ? 'Target from event goal' : 'Target from weekly hours budget'}
                        {summary.targetTss > 0 ? ` · ${pct}% of budget` : ''}
                    </p>
                </div>
                {summary.targetTss > 0 && (
                    <div className="text-sm text-cdtext">
                        {summary.remainingTss > 0 ? (
                            <span className="text-cdaccent font-semibold tabular-nums">{summary.remainingTss} TSS remaining</span>
                        ) : summary.overByTss > 0 ? (
                            <span className="text-orange-400 font-semibold tabular-nums">{summary.overByTss} TSS over budget</span>
                        ) : (
                            <span className="text-emerald-400 font-semibold">Budget met</span>
                        )}
                    </div>
                )}
            </div>

            {summary.targetTss > 0 && (
                <div className="mt-3 h-2 rounded-full bg-cdborder/60 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${barWidth > 115 ? 'bg-orange-400' : barWidth >= 85 ? 'bg-emerald-400' : 'bg-cdaccent'}`}
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            )}

            {summary.optimalBand?.max > 0 && (
                <p className="text-[11px] text-cdmuted mt-2">
                    Optimal band: {summary.optimalBand.min}–{summary.optimalBand.max} TSS this week.
                </p>
            )}
        </div>
    );
}
