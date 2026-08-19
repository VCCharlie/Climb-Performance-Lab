import React, { useMemo } from 'react';
import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import {
    buildAerobicEfficiencyTrend,
    summarizeAerobicDecoupling,
    decouplingStatusLabel,
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

export default function CoachAerobicDecoupling({
    activities,
    profileFtp,
    referenceYmd,
}) {
    const trend = useMemo(
        () => buildAerobicEfficiencyTrend(activities, profileFtp, { referenceYmd, weeks: 12 }),
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

                {trend.weeklyPoints.some((w) => w.avgEf != null) && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-2">
                            Weekly efficiency (W/bpm)
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
                        <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-2">
                            Recent within-ride decoupling
                        </p>
                        <ul className="space-y-1.5">
                            {trend.recentDecoupling.map((row) => (
                                <li
                                    key={row.activityId || `${row.date}-${row.title}`}
                                    className="flex items-center justify-between gap-2 text-[11px] rounded-md border border-cdborder/40 px-2 py-1.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-cdtext truncate">
                                            {row.title || 'Untitled ride'}
                                        </p>
                                        <p className="text-[9px] text-cdmuted tabular-nums">
                                            {row.date ? formatDateDDMMYYYY(row.date) : '—'}
                                            {row.decouplingSource ? ` · ${row.decouplingSource}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-cdtext tabular-nums font-semibold">
                                            {row.decouplingPct != null ? `${row.decouplingPct.toFixed(1)}%` : '—'}
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${statusBadgeClass(row.status)}`}>
                                            {decouplingStatusLabel(row.status)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="text-[10px] text-cdmuted leading-relaxed">
                    Within-ride decoupling compares power:HR in the first vs second half of a steady ride.
                    After Intervals.icu sync (with API key or Strava connected), eligible rides are analyzed
                    automatically — up to 8 per sync. Use Activities → Decoupling backfill to fill older rides
                    (24 per run). Without streams, this panel still tracks aerobic efficiency (EF) on eligible
                    endurance rides.
                </p>
            </div>
        </CollapsibleSection>
    );
}
