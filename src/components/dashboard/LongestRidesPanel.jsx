import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Route } from 'lucide-react';
import { formatNlNumber } from '../../utils';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
    boundsFromYmdRange,
    aggregatePeriodStats,
    topNLongestRidesByDistanceKm,
    boundsToYmdPair,
} from '../../utils/dashboardActivityWindow';
import { COMPARE_OPTIONS, formatLongRange } from './powerTopTenByDurationConstants';
import { dashboardFilterLabel } from '../../utils/powerDurationTable';
import PowerTopTenCustomRanges from './PowerTopTenCustomRanges';
import { PeriodSummaryCard } from './powerTopTenByDurationUi';
import LongestRidesTable from './LongestRidesTable';

/**
 * Top 10 langste ritten (afstand km) in dashboard-venster, optioneel vergeleken met tweede periode.
 */
const LongestRidesPanel = ({
    chartData,
    timeRange,
    customStart,
    customEnd,
    referenceEndDate,
    onOpenActivityInLog,
}) => {
    const [expanded, setExpanded] = useState(true);
    const [compareMode, setCompareMode] = useState('none');
    const [compareDays, setCompareDays] = useState(42);
    const [customPrimaryStart, setCustomPrimaryStart] = useState('');
    const [customPrimaryEnd, setCustomPrimaryEnd] = useState('');
    const [customCompareStart, setCustomCompareStart] = useState('');
    const [customCompareEnd, setCustomCompareEnd] = useState('');

    const dashboardBounds = useMemo(
        () => getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate),
        [timeRange, customStart, customEnd, referenceEndDate],
    );

    const refYear = useMemo(() => {
        const d = referenceEndDate ? new Date(referenceEndDate) : new Date();
        return Number.isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    }, [referenceEndDate]);

    const yearPresets = useMemo(() => {
        const out = [];
        for (let i = 0; i < 8; i += 1) out.push(refYear - i);
        return out;
    }, [refYear]);

    const boundsPrimary = useMemo(() => {
        if (compareMode === 'custom') {
            return boundsFromYmdRange(customPrimaryStart, customPrimaryEnd);
        }
        return dashboardBounds;
    }, [compareMode, customPrimaryStart, customPrimaryEnd, dashboardBounds]);

    const compareBounds = useMemo(() => {
        if (!dashboardBounds || compareMode === 'none') return null;
        if (compareMode === 'previous') return previousWindowBounds(dashboardBounds);
        if (compareMode === 'days' && compareDays > 0) return compareDaysBeforeWindow(dashboardBounds, compareDays);
        if (compareMode === 'custom') return boundsFromYmdRange(customCompareStart, customCompareEnd);
        return null;
    }, [dashboardBounds, compareMode, compareDays, customCompareStart, customCompareEnd]);

    const currentActs = useMemo(
        () => (boundsPrimary ? filterActivitiesInBounds(chartData, boundsPrimary) : []),
        [chartData, boundsPrimary],
    );

    const compareActs = useMemo(
        () => (compareBounds ? filterActivitiesInBounds(chartData, compareBounds) : []),
        [chartData, compareBounds],
    );

    const statsPrimary = useMemo(() => aggregatePeriodStats(currentActs), [currentActs]);
    const statsCompare = useMemo(() => aggregatePeriodStats(compareActs), [compareActs]);

    const diffSummary = useMemo(() => {
        if (!compareBounds || !boundsPrimary) return null;
        const dr = statsPrimary.rideCount - statsCompare.rideCount;
        const dk = statsPrimary.distanceKm - statsCompare.distanceKm;
        const de = statsPrimary.elevationM - statsCompare.elevationM;
        const fmt = (n, suffix = '') => {
            const sign = n > 0 ? '+' : '';
            return `${sign}${formatNlNumber(Math.round(n * 10) / 10)}${suffix}`;
        };
        return `Verschil (kolom 1 − kolom 2): ritten ${fmt(dr)} · km ${fmt(dk)} · hoogte ${fmt(de, ' m')}`;
    }, [compareBounds, boundsPrimary, statsPrimary, statsCompare]);

    const periodLabel = dashboardFilterLabel(timeRange);

    const primaryRows = useMemo(() => topNLongestRidesByDistanceKm(currentActs, 10), [currentActs]);
    const compareRows = useMemo(
        () => (compareBounds ? topNLongestRidesByDistanceKm(compareActs, 10) : []),
        [compareActs, compareBounds],
    );

    if (!chartData?.length || !dashboardBounds) return null;

    const headerRangeHint = compareMode === 'custom' && boundsPrimary
        ? formatLongRange(boundsPrimary)
        : formatLongRange(dashboardBounds);

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl shadow-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-cdborder/20 transition-colors"
                aria-expanded={expanded}
            >
                <div className="mt-0.5 text-emerald-400 shrink-0">
                    <Route size={22} strokeWidth={2.2} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-cdtext">Top 10 langste ritten</span>
                        {expanded ? <ChevronDown size={18} className="text-cdmuted shrink-0" /> : <ChevronRight size={18} className="text-cdmuted shrink-0" />}
                    </div>
                    <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                        Gesorteerd op opgeslagen afstand (km). Zelfde site-preset als boven; optioneel tweede periode naast kolom 1.
                        {' '}
                        {compareMode === 'custom' ? (
                            <>
                                <span className="text-cdtext font-medium">Aangepaste datums</span>
                                {headerRangeHint && (
                                    <span className="block mt-0.5 text-[11px] text-cdmuted">{headerRangeHint}</span>
                                )}
                            </>
                        ) : (
                            <>
                                Site-preset: <span className="text-cdtext font-medium">{periodLabel}</span>
                                {headerRangeHint && (
                                    <span className="block mt-0.5 text-[11px] text-cdmuted">{headerRangeHint}</span>
                                )}
                            </>
                        )}
                    </p>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-cdborder/60">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 pt-3">
                        <label className="flex flex-col gap-1 text-xs text-cdmuted min-w-[220px]">
                            <span className="font-semibold text-cdtext">Vergelijking</span>
                            <select
                                value={compareMode}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === 'custom' && dashboardBounds) {
                                        const p = boundsToYmdPair(dashboardBounds);
                                        const prev = previousWindowBounds(dashboardBounds);
                                        const c = prev ? boundsToYmdPair(prev) : { startYmd: '', endYmd: '' };
                                        setCustomPrimaryStart(p.startYmd);
                                        setCustomPrimaryEnd(p.endYmd);
                                        setCustomCompareStart(c.startYmd);
                                        setCustomCompareEnd(c.endYmd);
                                    }
                                    setCompareMode(v);
                                }}
                                className="bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-cdtext text-sm"
                            >
                                {COMPARE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                        {compareMode === 'days' && (
                            <label className="flex flex-col gap-1 text-xs text-cdmuted w-full sm:w-32">
                                <span className="font-semibold text-cdtext">Dagen vóór start</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={compareDays}
                                    onChange={(e) => setCompareDays(Math.max(1, Number(e.target.value) || 1))}
                                    className="bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-cdtext text-sm font-mono"
                                />
                            </label>
                        )}
                    </div>

                    {boundsPrimary && (
                        <div className={`grid gap-3 ${compareBounds ? 'lg:grid-cols-2' : ''}`}>
                            <PeriodSummaryCard
                                title="Kolom 1 — primaire periode"
                                accentClass="border-emerald-500/35 bg-emerald-500/[0.07]"
                                bounds={boundsPrimary}
                                stats={statsPrimary}
                            />
                            {compareBounds && (
                                <PeriodSummaryCard
                                    title="Kolom 2 — vergelijking"
                                    accentClass="border-blue-500/35 bg-blue-500/[0.07]"
                                    bounds={compareBounds}
                                    stats={statsCompare}
                                />
                            )}
                        </div>
                    )}

                    {diffSummary && (
                        <p className="text-[11px] text-cdmuted border-b border-cdborder/40 pb-2">{diffSummary}</p>
                    )}

                    {compareMode === 'custom' && (
                        <PowerTopTenCustomRanges
                            yearPresets={yearPresets}
                            customPrimaryStart={customPrimaryStart}
                            setCustomPrimaryStart={setCustomPrimaryStart}
                            customPrimaryEnd={customPrimaryEnd}
                            setCustomPrimaryEnd={setCustomPrimaryEnd}
                            customCompareStart={customCompareStart}
                            setCustomCompareStart={setCustomCompareStart}
                            customCompareEnd={customCompareEnd}
                            setCustomCompareEnd={setCustomCompareEnd}
                            boundsPrimary={boundsPrimary}
                            compareBounds={compareBounds}
                        />
                    )}

                    <div className={`grid gap-4 ${compareBounds ? 'lg:grid-cols-2' : ''}`}>
                        <div>
                            <h4 className="text-[10px] font-bold uppercase text-cdaccent mb-2">Kolom 1</h4>
                            <LongestRidesTable rows={primaryRows} peerRows={compareRows} onOpenActivityInLog={onOpenActivityInLog} />
                        </div>
                        {compareBounds && (
                            <div>
                                <h4 className="text-[10px] font-bold uppercase text-blue-400 mb-2">Kolom 2</h4>
                                <LongestRidesTable rows={compareRows} peerRows={primaryRows} onOpenActivityInLog={onOpenActivityInLog} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LongestRidesPanel;
