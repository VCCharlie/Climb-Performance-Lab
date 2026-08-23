import React, { useMemo } from 'react';
import { Activity, ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { chartCardClass } from '../../utils/chartTheme';
import CollapsibleInfoCard from '../ui/CollapsibleInfoCard';
import {
    computeYearlyPowerPeakRows,
    computePowerLongevitySummary,
    normalizeBirthYear,
} from '../../utils/powerTrendSeries';
import { resolveHistoricalFtpMap } from '../../utils/historicalFtp';

function pctLabel(pct) {
    if (pct == null || Number.isNaN(pct)) return '—';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${Math.round(pct)}%`;
}

/**
 * One-glance long-term power snapshot on Dashboard Overview.
 */
export default function PowerLongevityCard({
    activities,
    manualFtp = 0,
    weightKg = 0,
    userSettings,
    onGoToPowerTab,
    bare = false,
}) {
    const summary = useMemo(() => {
        const historicalFtpByYear = resolveHistoricalFtpMap(userSettings, activities);
        const rows = computeYearlyPowerPeakRows(activities, manualFtp, weightKg, historicalFtpByYear);
        return computePowerLongevitySummary(rows, new Date());
    }, [activities, manualFtp, weightKg, userSettings]);

    const birthYear = normalizeBirthYear(userSettings?.birthYear);

    if (!summary) return null;

    const pct = summary.pctVsPeakEftp20;
    const pctTone = pct == null
        ? 'text-cdmuted'
        : pct > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : pct < 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-cdtext';

    const body = (
        <>
            <div className={`flex items-start justify-between gap-3 ${bare ? 'mb-3' : 'mb-4'}`}>
                <div className="flex items-start gap-2 min-w-0">
                    {!bare ? (
                        <Activity className="w-5 h-5 text-cdblue shrink-0 mt-0.5" aria-hidden />
                    ) : null}
                    <div className="min-w-0">
                        {!bare ? (
                            <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">
                                Long-term power
                            </h3>
                        ) : null}
                        <p className="text-[11px] text-cdmuted leading-snug">
                            Peak eFTP (20 min × 0.95) per calendar year — {summary.yearsWithPowerData} years with data.
                            {birthYear ? ` Age axis available (born ${birthYear}).` : ''}
                        </p>
                    </div>
                </div>
                {onGoToPowerTab && (
                    <button
                        type="button"
                        onClick={onGoToPowerTab}
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-cdaccent hover:underline"
                    >
                        View trends
                        <ChevronRight size={14} aria-hidden />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-cdborder/70 bg-cdbg/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">All-time peak</p>
                    <p className="text-2xl font-black text-cdtext tabular-nums">
                        {summary.peakEftp20}
                        <span className="text-sm font-semibold text-cdmuted ml-1">W eFTP</span>
                    </p>
                    <p className="text-[11px] text-cdmuted mt-1">
                        {summary.peakYear}
                        {summary.peakBest20min ? ` · ${summary.peakBest20min} W peak` : ''}
                    </p>
                </div>

                <div className="rounded-lg border border-cdborder/70 bg-cdbg/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">
                        {summary.currentYear} best
                    </p>
                    <p className="text-2xl font-black text-cdtext tabular-nums">
                        {summary.currentEftp20 ?? '—'}
                        <span className="text-sm font-semibold text-cdmuted ml-1">W eFTP</span>
                    </p>
                    <p className="text-[11px] text-cdmuted mt-1">
                        {summary.currentRideCount} rides
                        {summary.currentBest20min ? ` · ${summary.currentBest20min} W peak` : ''}
                    </p>
                </div>

                <div className="rounded-lg border border-cdborder/70 bg-cdbg/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-cdmuted mb-1">Vs peak year</p>
                    <p className={`text-2xl font-black tabular-nums flex items-center gap-1 ${pctTone}`}>
                        {pct != null && pct > 0 && <ArrowUp size={20} aria-hidden />}
                        {pct != null && pct < 0 && <ArrowDown size={20} aria-hidden />}
                        {pctLabel(pct)}
                    </p>
                    <p className="text-[11px] text-cdmuted mt-1">
                        {summary.currentEftp20 != null
                            ? `Compared to ${summary.peakEftp20} W in ${summary.peakYear}`
                            : 'No eFTP peak yet this year'}
                    </p>
                </div>
            </div>

            {!birthYear && (
                <CollapsibleInfoCard
                    title="Age timeline"
                    defaultExpanded={false}
                    variant="default"
                    className="!shadow-none mt-3"
                    bodyClassName="!text-[10px] !text-cdmuted"
                >
                    Add your birth year in Settings to plot power against age on the Power tab.
                </CollapsibleInfoCard>
            )}
        </>
    );

    if (bare) return body;

    return <div className={chartCardClass}>{body}</div>;
}
