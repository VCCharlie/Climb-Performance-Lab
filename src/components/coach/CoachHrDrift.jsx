import React, { useMemo, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Minus, ChevronDown, Info } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';
import { SegmentedControl } from '../ui';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import {
    buildDriftProfileTrend,
    buildDriftProfilePortfolio,
    summarizeDriftProfile,
    countDriftProfileSignals,
    driftProfileRationale,
    driftProfileLabel,
    decouplingStatusLabel,
    DRIFT_TAB_ORDER,
    DECOUPLING_STATUS,
    AEROBIC_TREND_STATUS,
} from '../../utils/coach/rideDriftTrend';
import { DRIFT_PROFILE } from '../../utils/coach/rideDurability';

const EF_CHART_BAR_AREA_PX = 64;
const DRIFT_CHART_BAR_AREA_PX = 64;
const EF_BAR_ACTIVE_FILL = 'rgb(var(--cd-primary-rgb) / 0.9)';
const EF_BAR_ACTIVE_BORDER = 'rgb(var(--cd-primary-rgb) / 0.45)';
const EF_BAR_EMPTY_FILL = 'var(--cd-surface-container-high)';

const TAB_LABELS = {
    [DRIFT_PROFILE.STEADY]: 'Steady',
    [DRIFT_PROFILE.THRESHOLD]: 'Threshold',
    [DRIFT_PROFILE.RACE]: 'Race',
};

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

function WeeklyEfChart({ weeklyPoints, maxEf }) {
    if (!weeklyPoints?.some((w) => w.avgEf != null)) return null;

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                Weekly aerobic efficiency (W/bpm)
            </p>
            <p className="text-[9px] text-cdmuted mb-2 leading-relaxed">
                Long-term trend on steady rides — are you producing more watts per heartbeat over time?
            </p>
            <div className="overflow-x-auto -mx-1 px-1" aria-label="Weekly aerobic efficiency chart">
                <div className="flex items-end gap-0.5 min-w-[17.5rem]">
                    {weeklyPoints.map((week) => {
                        const barHeightPx = week.avgEf != null
                            ? Math.max(6, Math.round((week.avgEf / maxEf) * EF_CHART_BAR_AREA_PX))
                            : 4;
                        return (
                            <div
                                key={week.weekStart}
                                className="flex-1 min-w-0 flex flex-col items-center gap-0.5"
                                title={week.avgEf != null ? `${week.avgEf.toFixed(2)} W/bpm · ${week.rideCount} ride(s)` : 'No steady rides this week'}
                            >
                                {week.avgEf != null ? (
                                    <span className="text-[7px] text-cdmuted tabular-nums leading-none h-[10px]">
                                        {week.avgEf.toFixed(2)}
                                    </span>
                                ) : (
                                    <span className="h-[10px]" aria-hidden />
                                )}
                                <div
                                    className="w-full flex items-end justify-center"
                                    style={{ height: `${EF_CHART_BAR_AREA_PX}px` }}
                                >
                                    <div
                                        className="w-full max-w-[1.25rem] min-w-[4px] shrink-0 rounded-t"
                                        style={{
                                            height: `${barHeightPx}px`,
                                            backgroundColor: week.avgEf != null ? EF_BAR_ACTIVE_FILL : EF_BAR_EMPTY_FILL,
                                            border: week.avgEf != null
                                                ? `1px solid ${EF_BAR_ACTIVE_BORDER}`
                                                : '1px solid var(--cd-border)',
                                        }}
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
        </div>
    );
}

function WeeklyDriftChart({ weeklyDriftPoints, profile }) {
    if (!weeklyDriftPoints?.some((w) => w.avgDriftPct != null)) return null;

    const values = weeklyDriftPoints.map((w) => w.avgDriftPct).filter((v) => v != null);
    const maxDrift = values.length ? Math.max(...values) : 1;
    const label = driftProfileLabel(profile);

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                Weekly {label.toLowerCase()} (%)
            </p>
            <p className="text-[9px] text-cdmuted mb-2 leading-relaxed">
                Average within-ride drift on analyzed {label.toLowerCase()} rides — lower is better.
            </p>
            <div className="overflow-x-auto -mx-1 px-1" aria-label={`Weekly ${label} drift chart`}>
                <div className="flex items-end gap-0.5 min-w-[17.5rem]">
                    {weeklyDriftPoints.map((week) => {
                        const barHeightPx = week.avgDriftPct != null
                            ? Math.max(6, Math.round((week.avgDriftPct / maxDrift) * DRIFT_CHART_BAR_AREA_PX))
                            : 4;
                        return (
                            <div
                                key={week.weekStart}
                                className="flex-1 min-w-0 flex flex-col items-center gap-0.5"
                                title={week.avgDriftPct != null
                                    ? `${week.avgDriftPct.toFixed(1)}% · ${week.analyzedCount} analyzed`
                                    : `${week.rideCount} eligible ride(s), none analyzed`}
                            >
                                {week.avgDriftPct != null ? (
                                    <span className="text-[7px] text-cdmuted tabular-nums leading-none h-[10px]">
                                        {week.avgDriftPct.toFixed(1)}
                                    </span>
                                ) : (
                                    <span className="h-[10px]" aria-hidden />
                                )}
                                <div
                                    className="w-full flex items-end justify-center"
                                    style={{ height: `${DRIFT_CHART_BAR_AREA_PX}px` }}
                                >
                                    <div
                                        className="w-full max-w-[1.25rem] min-w-[4px] shrink-0 rounded-t bg-emerald-500/80"
                                        style={{
                                            height: `${barHeightPx}px`,
                                            opacity: week.avgDriftPct != null ? 1 : 0.25,
                                            backgroundColor: week.avgDriftPct != null
                                                ? 'rgb(16 185 129 / 0.85)'
                                                : EF_BAR_EMPTY_FILL,
                                        }}
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
        </div>
    );
}

function DriftProfilePanel({ profile, activities, profileFtp, referenceYmd }) {
    const [showRationale, setShowRationale] = useState(false);

    const trend = useMemo(
        () => buildDriftProfileTrend(activities, profileFtp, profile, { referenceYmd, weeks: 12 }),
        [activities, profileFtp, referenceYmd, profile],
    );
    const portfolio = useMemo(
        () => buildDriftProfilePortfolio(activities, profileFtp, profile, { referenceYmd, weeks: 12 }),
        [activities, profileFtp, referenceYmd, profile],
    );
    const summary = useMemo(() => summarizeDriftProfile(trend, profile), [trend, profile]);
    const rationale = driftProfileRationale(profile);

    const maxEf = useMemo(() => {
        const values = trend.weeklyPoints?.map((w) => w.avgEf).filter((v) => v != null) || [];
        return values.length ? Math.max(...values) : 1;
    }, [trend.weeklyPoints]);

    const distributionTotal = portfolio.goodCount + portfolio.moderateCount + portfolio.highCount;
    const driftLabel = portfolio.driftMetricLabel || 'drift';

    return (
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
                                ? `${portfolio.pendingStreamCount} eligible ride(s) still waiting for streams`
                                : 'All eligible rides in window analyzed'}
                        />
                        <PortfolioStat
                            label={`Avg ${driftLabel}`}
                            value={portfolio.avgDriftPct != null
                                ? `${portfolio.avgDriftPct.toFixed(1)}%`
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
                                {portfolio.goodCount} low · {portfolio.moderateCount} moderate · {portfolio.highCount} high {driftLabel}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {trend.showWeeklyEfChart && (
                <WeeklyEfChart weeklyPoints={trend.weeklyPoints} maxEf={maxEf} />
            )}

            {!trend.showWeeklyEfChart && (
                <WeeklyDriftChart weeklyDriftPoints={trend.weeklyDriftPoints} profile={profile} />
            )}

            {trend.recentDrift?.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                        Recent within-ride {driftLabel}
                    </p>
                    <p className="text-[9px] text-cdmuted mb-2 leading-relaxed">
                        Per-ride cardiac drift: same power, more HR in the second half = higher %.
                    </p>
                    <ul className="space-y-1.5">
                        {trend.recentDrift.map((row) => (
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
                                            {row.source ? ` · ${row.source}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-cdtext tabular-nums font-bold text-sm">
                                            {row.driftPct != null ? `${row.driftPct.toFixed(1)}%` : '—'}
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
                                        {row.driftPct != null && row.driftPct <= 5
                                            ? 'HR stayed coupled to power'
                                            : row.driftPct <= 10
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
                    {rationale.title}
                    <ChevronDown
                        size={14}
                        className={`ml-auto shrink-0 text-cdmuted transition-transform ${showRationale ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>
                {showRationale && (
                    <ul className="px-3 pb-3 space-y-1.5 text-[10px] text-cdmuted leading-relaxed list-disc pl-7">
                        {rationale.bullets.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default function CoachHrDrift({
    activities,
    profileFtp,
    referenceYmd,
}) {
    const signals = useMemo(
        () => countDriftProfileSignals(activities, profileFtp),
        [activities, profileFtp],
    );

    const defaultTab = useMemo(() => {
        const withData = DRIFT_TAB_ORDER.find((p) => signals[p]?.analyzed > 0);
        if (withData) return withData;
        const withEligible = DRIFT_TAB_ORDER.find((p) => signals[p]?.eligible > 0);
        return withEligible || DRIFT_PROFILE.STEADY;
    }, [signals]);

    const [activeTab, setActiveTab] = useState(defaultTab);

    const totalAnalyzed = DRIFT_TAB_ORDER.reduce((sum, p) => sum + (signals[p]?.analyzed || 0), 0);
    const totalEligible = DRIFT_TAB_ORDER.reduce((sum, p) => sum + (signals[p]?.eligible || 0), 0);
    const subtitle = totalEligible > 0
        ? `${totalAnalyzed} analyzed · ${totalEligible} eligible across steady / threshold / race · last 12 weeks`
        : 'Stream-based HR drift on steady, threshold, and race-style rides';

    return (
        <CollapsibleSection
            title="HR drift & aerobic efficiency"
            subtitle={subtitle}
            icon={Activity}
            iconClassName="text-emerald-400"
            defaultExpanded={totalAnalyzed > 0 || totalEligible > 0}
        >
            <div className="space-y-4">
                <SegmentedControl
                    size="sm"
                    caps={false}
                    value={activeTab}
                    onChange={setActiveTab}
                    aria-label="HR drift profile"
                    className="flex-wrap"
                    options={DRIFT_TAB_ORDER.map((profile) => {
                        const badge = signals[profile]?.analyzed || 0;
                        const baseLabel = TAB_LABELS[profile];
                        return {
                            value: profile,
                            label: badge > 0 ? `${baseLabel} (${badge})` : baseLabel,
                        };
                    })}
                />

                <div role="tabpanel">
                    <DriftProfilePanel
                        key={activeTab}
                        profile={activeTab}
                        activities={activities}
                        profileFtp={profileFtp}
                        referenceYmd={referenceYmd}
                    />
                </div>

                <p className="text-[10px] text-cdmuted leading-relaxed">
                    Activities → Decoupling backfill fetches power+HR streams (24 per run).
                    Dec / Thr / Race columns in the Activity Log show per-ride values.
                </p>
            </div>
        </CollapsibleSection>
    );
}
