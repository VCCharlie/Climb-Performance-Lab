import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Route } from 'lucide-react';
import { formatNlNumber } from '../../utils';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
    boundsFromYmdRange,
    aggregateStatsFromLongestRideRows,
    topNLongestRidesByDistanceKm,
    boundsToYmdPair,
} from '../../utils/dashboardActivityWindow';
import { COMPARE_OPTIONS, formatLongRange } from './powerTopTenByDurationConstants';
import { dashboardFilterLabel } from '../../utils/powerDurationTable';
import PowerTopTenCustomRanges from './PowerTopTenCustomRanges';
import { PeriodSummaryCard } from './powerTopTenByDurationUi';
import LongestRidesTable from './LongestRidesTable';
import StickyCompareColumnSwitcher from './StickyCompareColumnSwitcher';
import { chartCardShellClass } from '../../utils/chartTheme';

/**
 * Top 10 longest rides (distance km) in the dashboard window, optionally compared to a second period.
 */
const LongestRidesPanel = ({
    activities,
    timeRange,
    customStart,
    customEnd,
    referenceEndDate,
    onOpenActivityInLog,
}) => {
    const [expanded, setExpanded] = useState(true);
    const [compareMode, setCompareMode] = useState('none');
    const [compareDays, setCompareDays] = useState(42);
    const [mobileCompareColumn, setMobileCompareColumn] = useState(1);
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
        () => (boundsPrimary ? filterActivitiesInBounds(activities, boundsPrimary) : []),
        [activities, boundsPrimary],
    );

    const compareActs = useMemo(
        () => (compareBounds ? filterActivitiesInBounds(activities, compareBounds) : []),
        [activities, compareBounds],
    );

    const periodLabel = dashboardFilterLabel(timeRange);

    const primaryRows = useMemo(() => topNLongestRidesByDistanceKm(currentActs, 10), [currentActs]);
    const compareRows = useMemo(
        () => (compareBounds ? topNLongestRidesByDistanceKm(compareActs, 10) : []),
        [compareActs, compareBounds],
    );

    const statsPrimary = useMemo(() => aggregateStatsFromLongestRideRows(primaryRows), [primaryRows]);
    const statsCompare = useMemo(() => aggregateStatsFromLongestRideRows(compareRows), [compareRows]);

    const diffSummary = useMemo(() => {
        if (!compareBounds || !boundsPrimary) return null;
        const dr = statsPrimary.rideCount - statsCompare.rideCount;
        const dk = statsPrimary.distanceKm - statsCompare.distanceKm;
        const de = statsPrimary.elevationM - statsCompare.elevationM;
        const fmt = (n, suffix = '') => {
            const sign = n > 0 ? '+' : '';
            return `${sign}${formatNlNumber(Math.round(n * 10) / 10)}${suffix}`;
        };
        return `Difference (column 1 − column 2): rides ${fmt(dr)} · km ${fmt(dk)} · elevation ${fmt(de, ' m')}`;
    }, [compareBounds, boundsPrimary, statsPrimary, statsCompare]);

    if (!activities?.length || !dashboardBounds) return null;

    const headerRangeHint = compareMode === 'custom' && boundsPrimary
        ? formatLongRange(boundsPrimary)
        : formatLongRange(dashboardBounds);

    return (
        <div className={chartCardShellClass}>
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
                        <span className="text-lg font-bold text-cdtext">Top 10 longest rides</span>
                        {expanded ? <ChevronDown size={18} className="text-cdmuted shrink-0" /> : <ChevronRight size={18} className="text-cdmuted shrink-0" />}
                    </div>
                    <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                        Sorted by stored distance (km). Same site preset as above; optional second period next to column 1.
                        {' '}
                        {compareMode === 'custom' ? (
                            <>
                                <span className="text-cdtext font-medium">Custom dates</span>
                                {headerRangeHint && (
                                    <span className="block mt-0.5 text-[11px] text-cdmuted">{headerRangeHint}</span>
                                )}
                            </>
                        ) : (
                            <>
                                Site preset: <span className="text-cdtext font-medium">{periodLabel}</span>
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
                        <label className="flex flex-col gap-1 text-xs text-cdmuted w-full sm:min-w-[220px]">
                            <span className="font-semibold text-cdtext">Comparison</span>
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
                                className="bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-cdtext text-sm w-full"
                            >
                                {COMPARE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                        {compareMode === 'days' && (
                            <label className="flex flex-col gap-1 text-xs text-cdmuted w-full sm:w-32">
                                <span className="font-semibold text-cdtext">Days before start</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={compareDays}
                                    onChange={(e) => setCompareDays(Math.max(1, Number(e.target.value) || 1))}
                                    className="bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-cdtext text-sm tabular-nums"
                                />
                            </label>
                        )}
                    </div>

                    <StickyCompareColumnSwitcher
                        showCompare={Boolean(compareBounds)}
                        activeColumn={mobileCompareColumn}
                        onChange={setMobileCompareColumn}
                    />

                    {boundsPrimary && (
                        <p className="text-[11px] text-cdmuted leading-relaxed">
                            Totals and averages in the boxes below include only the rides listed in the tables (top 10 by distance per column), not every ride in the date range.
                        </p>
                    )}

                    {boundsPrimary && (
                        <div className={`grid gap-3 ${compareBounds ? 'lg:grid-cols-2' : ''}`}>
                            {(!compareBounds || mobileCompareColumn === 1) && (
                                <div className={compareBounds ? 'lg:block' : ''}>
                                    <PeriodSummaryCard
                                        title="Column 1 — primary period"
                                        accentClass="border-emerald-500/35 bg-emerald-500/[0.07]"
                                        bounds={boundsPrimary}
                                        stats={statsPrimary}
                                        showRideAverages
                                    />
                                </div>
                            )}
                            {compareBounds && (
                                <div className={mobileCompareColumn === 2 ? 'block' : 'hidden lg:block'}>
                                    <PeriodSummaryCard
                                        title="Column 2 — comparison"
                                        accentClass="border-blue-500/35 bg-blue-500/[0.07]"
                                        bounds={compareBounds}
                                        stats={statsCompare}
                                        showRideAverages
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {diffSummary && (
                        <p className="text-[11px] text-cdmuted border-b border-cdborder/40 pb-2 leading-relaxed break-words">
                            {diffSummary}
                        </p>
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
                        <div className={compareBounds && mobileCompareColumn !== 1 ? 'hidden lg:block' : ''}>
                            <h4 className="text-[10px] font-bold uppercase text-cdaccent mb-2">Column 1</h4>
                            <LongestRidesTable rows={primaryRows} peerRows={compareRows} onOpenActivityInLog={onOpenActivityInLog} />
                        </div>
                        {compareBounds && (
                            <div className={mobileCompareColumn === 2 ? 'block' : 'hidden lg:block'}>
                                <h4 className="text-[10px] font-bold uppercase text-blue-400 mb-2">Column 2</h4>
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
