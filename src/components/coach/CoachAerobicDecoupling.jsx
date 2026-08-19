import React, { useMemo, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Minus, ChevronDown, Info } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import {
    buildAerobicEfficiencyTrend,
    buildDecouplingPortfolioSummary,
    summarizeAerobicDecoupling,
    decouplingStatusLabel,
    STEADY_RIDE_DECOUPLING_RATIONALE,
    AEROBIC_TREND_STATUS,
    DECOUPLING_STATUS,
} from '../../utils/coach/aerobicDecoupling';

function TrendIcon({ status }) {
    if (status === AEROBIC_TREND_STATUS.IMPROVING) {
        return <TrendingUp size={16} className="text-emerald-400 shrink-0" aria-hidden />;
    }
    if (status === AEROBIC_TREND_STATUS.DECLINING) {
        return <TrendingDown size={16} className="text-orange-400 shrink-0" aria-hidden />;
    }
    return <Minus size={16} className="text-cdmuted shrink-0" aria-hidden />;
}

function statusBadgeClass(status) {
    switch (status) {
        case DECOUPLING_STATUS.GOOD:
            return 'bg-emerald-500/15 text-emerald-300';
        case DECOUPLING_STATUS.MODERATE:
            return 'bg-orange-500/15 text-orange-300';
        case DECOUPLING_STATUS.HIGH:
            return 'bg-red-500/15 text-red-300';
        default:
            return 'bg-cdborder/30 text-cdmuted';
    }
}

function PortfolioStat({ label, value, hint }) {
    return (
        <div className="rounded-lg border border-cdborder/50 bg-cdbg/30 p-2.5 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wide text-cdmuted">{label}</p>
            <p className="text-lg font-bold text-cdtext tabular-nums leading-tight mt-0.5">{value}</p>
            {hint ? <p className="text-[9px] text-cdmuted mt-1 leading-snug">{hint}</p> : null}
        </div>
    );
}

export default function CoachAerobicDecoupling({
    activities,
    profileFtp,
    referenceYmd,
}) {
    const [showRationale, setShowRationale] = useState(false);

    const trend = useMemo(
        () => buildAerobicEfficiencyTrend(activities, profileFtp, { referenceYmd, weeks: 12 }),
        [activities, profileFtp, referenceYmd],
    );
    const portfolio = useMemo(
        () => buildDecouplingPortfolioSummary(activities, profileFtp, { referenceYmd, weeks: 12 }),
        [activities, profileFtp, referenceYmd],
    );
    const summary = useMemo(() => summarizeAerobicDecoupling(trend), [trend]);

    const maxEf = useMemo(() => {
        const values = trend.weeklyPoints.map((w) => w.avgEf).filter((v) => v != null);
        return values.length ? Math.max(...values) : 1;
    }, [trend.weeklyPoints]);

    const subtitle = trend.eligibleRideCount > 0
        ? `${trend.eligibleRideCount} steady ride${trend.eligibleRideCount === 1 ? '' : 's'} · last 12 weeks`
        : 'Steady endurance rides with HR data';

    const hasDecouplingData = (trend.recentDecoupling?.length ?? 0) > 0;
    const defaultExpanded = hasDecouplingData || trend.eligibleRideCount > 0;

    const distributionTotal = portfolio.goodCount + portfolio.moderateCount + portfolio.highCount;

    return (
        <CollapsibleSection
            title="Aerobic decoupling & efficiency"
            subtitle={subtitle}
            icon={Activity}
            iconClassName="text-emerald-400"
            defaultExpanded={defaultExpanded}
        >
            <div className="space-y-4">
                <div className="rounded-lg border border-cdborder/50 bg-cdborder/5 p-3">
                    <div className="flex items-start gap-2">
                        <TrendIcon status={summary.trendStatus} />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-cdtext">{summary.headline}</p>
                            <p className="text-[11px] text-cdmuted mt-1 leading-relaxed">{summary.detail}</p>
                        </div>
                    </div>
                </div>

                {portfolio.analyzedCount > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted">
                            Stream analysis snapshot (last {portfolio.weeks} weeks)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <PortfolioStat
                                label="Rides analyzed"
                                value={portfolio.analyzedCount}
                                hint={portfolio.pendingStreamCount > 0
                                    ? `${portfolio.pendingStreamCount} steady ride(s) still waiting for streams`
                                    : 'All eligible steady rides analyzed'}
                            />
                            <PortfolioStat
                                label="Avg decoupling"
                                value={portfolio.avgDecouplingPct != null
                                    ? `${portfolio.avgDecouplingPct.toFixed(1)}%`
                                    : '—'}
                                hint="Lower is better — HR drift vs power"
                            />
                            <PortfolioStat
                                label="Low drift rides"
                                value={portfolio.goodSharePct != null
                                    ? `${Math.round(portfolio.goodSharePct)}%`
                                    : '—'}
                                hint={`${portfolio.goodCount} of ${portfolio.analyzedCount} ≤5%`}
                            />
                            <PortfolioStat
                                label="Avg EF shift"
                                value={
                                    portfolio.avgEfFirst != null && portfolio.avgEfSecond != null
                                        ? `${portfolio.avgEfFirst.toFixed(2)}→${portfolio.avgEfSecond.toFixed(2)}`
                                        : '—'
                                }
                                hint="W/bpm first half → second half"
                            />
                        </div>
                        {distributionTotal > 0 && (
                            <div>
                                <div className="flex h-2 rounded-full overflow-hidden bg-cdborder/30" aria-hidden>
                                    <div
                                        className="bg-emerald-500/70"
                                        style={{ width: `${(portfolio.goodCount / distributionTotal) * 100}%` }}
                                    />
                                    <div
                                        className="bg-orange-500/70"
                                        style={{ width: `${(portfolio.moderateCount / distributionTotal) * 100}%` }}
                                    />
                                    <div
                                        className="bg-red-500/70"
                                        style={{ width: `${(portfolio.highCount / distributionTotal) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-cdmuted mt-1">
                                    {portfolio.goodCount} low · {portfolio.moderateCount} moderate · {portfolio.highCount} high decoupling
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {trend.weeklyPoints.some((w) => w.avgEf != null) && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                            Weekly aerobic efficiency (W/bpm)
                        </p>
                        <p className="text-[9px] text-cdmuted mb-2 leading-relaxed">
                            Long-term trend on steady rides — are you producing more watts per heartbeat over time?
                        </p>
                        <div className="flex items-end gap-0.5 h-28 px-0.5" aria-label="Weekly aerobic efficiency chart">
                            {trend.weeklyPoints.map((week) => {
                                const heightPct = week.avgEf != null
                                    ? Math.max(10, Math.round((week.avgEf / maxEf) * 100))
                                    : 6;
                                return (
                                    <div
                                        key={week.weekStart}
                                        className="flex-1 min-w-0 flex flex-col h-full items-center justify-end gap-0.5"
                                        title={week.avgEf != null ? `${week.avgEf.toFixed(2)} W/bpm · ${week.rideCount} ride(s)` : 'No steady rides this week'}
                                    >
                                        {week.avgEf != null && (
                                            <span className="text-[7px] text-cdmuted tabular-nums leading-none">
                                                {week.avgEf.toFixed(2)}
                                            </span>
                                        )}
                                        <div className="flex-1 w-full min-h-0 flex items-end justify-center">
                                            <div
                                                className={`w-full max-w-[1.25rem] rounded-t ${week.avgEf != null ? 'bg-cdaccent/70' : 'bg-cdborder/30'}`}
                                                style={{ height: `${heightPct}%`, minHeight: week.avgEf != null ? '6px' : '3px' }}
                                            />
                                        </div>
                                        <span className="text-[7px] text-cdmuted tabular-nums truncate w-full text-center leading-none">
                                            {formatDateDDMMYYYY(week.weekStart).slice(0, 5)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {trend.recentDecoupling?.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                            Recent within-ride decoupling
                        </p>
                        <p className="text-[9px] text-cdmuted mb-2 leading-relaxed">
                            Per-ride cardiac drift: same power, more HR in the second half = higher %.
                        </p>
                        <ul className="space-y-1.5">
                            {trend.recentDecoupling.map((row) => (
                                <li
                                    key={row.activityId || `${row.date}-${row.title}`}
                                    className="rounded-md border border-cdborder/40 px-2 py-2 space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-cdtext truncate font-medium">
                                                {row.title || 'Untitled ride'}
                                            </p>
                                            <p className="text-[9px] text-cdmuted tabular-nums">
                                                {row.date ? formatDateDDMMYYYY(row.date) : '—'}
                                                {row.decouplingSource ? ` · ${row.decouplingSource}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-cdtext tabular-nums font-bold text-sm">
                                                {row.decouplingPct != null ? `${row.decouplingPct.toFixed(1)}%` : '—'}
                                            </span>
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${statusBadgeClass(row.status)}`}>
                                                {decouplingStatusLabel(row.status)}
                                            </span>
                                        </div>
                                    </div>
                                    {row.efFirst != null && row.efSecond != null && (
                                        <p className="text-[9px] text-cdmuted tabular-nums">
                                            EF {row.efFirst.toFixed(2)} → {row.efSecond.toFixed(2)} W/bpm
                                            {' · '}
                                            {row.decouplingPct != null && row.decouplingPct <= 5
                                                ? 'HR stayed coupled to power'
                                                : row.decouplingPct <= 10
                                                    ? 'mild HR drift in 2nd half'
                                                    : 'strong HR drift in 2nd half'}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="rounded-lg border border-cdborder/40 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowRationale((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-cdtext hover:bg-cdborder/20 cd-focus-ring"
                        aria-expanded={showRationale}
                    >
                        <Info size={14} className="text-cdaccent shrink-0" aria-hidden />
                        {STEADY_RIDE_DECOUPLING_RATIONALE.title}
                        <ChevronDown
                            size={14}
                            className={`ml-auto shrink-0 text-cdmuted transition-transform ${showRationale ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </button>
                    {showRationale && (
                        <ul className="px-3 pb-3 space-y-1.5 text-[10px] text-cdmuted leading-relaxed list-disc pl-7">
                            {STEADY_RIDE_DECOUPLING_RATIONALE.bullets.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-[10px] text-cdmuted leading-relaxed">
                    Sync or Activities → Decoupling backfill fetches power+HR streams (24 per run).
                    Open any analyzed ride in Activities for the full decoupling breakdown.
                </p>
            </div>
        </CollapsibleSection>
    );
}
