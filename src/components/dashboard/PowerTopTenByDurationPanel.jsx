import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { formatNlNumber } from '../../utils';
import {
    dashboardFilterLabel,
    topNInterpolatedAtSec,
} from '../../utils/powerDurationTable';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
    boundsFromYmdRange,
    aggregatePeriodStats,
} from '../../utils/dashboardActivityWindow';
import {
    DURATION_TARGETS,
    formatLongRange,
} from './powerTopTenByDurationConstants';
import PowerTopTenExpandedBody from './PowerTopTenExpandedBody';

/**
 * Top 10 per vaste duur (geïnterpoleerd), optioneel naast vorige periode of N dagen ervoor.
 */
const PowerTopTenByDurationPanel = ({
    chartData,
    manualFtp,
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

    const tablesByDuration = useMemo(() => {
        return DURATION_TARGETS.map(({ sec, label }) => {
            const primary = topNInterpolatedAtSec(currentActs, manualFtp, sec, 10);
            const secondary = compareBounds ? topNInterpolatedAtSec(compareActs, manualFtp, sec, 10) : null;
            return { sec, label, primary, secondary };
        });
    }, [currentActs, compareActs, compareBounds, manualFtp]);

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
                <div className="mt-0.5 text-cdaccent shrink-0">
                    <Zap size={22} strokeWidth={2.2} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-cdtext">Top 10 per duur</span>
                        {expanded ? <ChevronDown size={18} className="text-cdmuted shrink-0" /> : <ChevronRight size={18} className="text-cdmuted shrink-0" />}
                    </div>
                    <p className="text-xs text-cdmuted mt-1 leading-relaxed">
                        Geïnterpoleerd vermogen (zelfde methode als de power-duration matrix).{' '}
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
                        {' '}Per duur: top 10 in het gekozen venster (kolom 1); optioneel naast kolom 2.
                    </p>
                </div>
            </button>

            {expanded && (
                <PowerTopTenExpandedBody
                    compareMode={compareMode}
                    setCompareMode={setCompareMode}
                    compareDays={compareDays}
                    setCompareDays={setCompareDays}
                    dashboardBounds={dashboardBounds}
                    setCustomPrimaryStart={setCustomPrimaryStart}
                    setCustomPrimaryEnd={setCustomPrimaryEnd}
                    setCustomCompareStart={setCustomCompareStart}
                    setCustomCompareEnd={setCustomCompareEnd}
                    boundsPrimary={boundsPrimary}
                    compareBounds={compareBounds}
                    statsPrimary={statsPrimary}
                    statsCompare={statsCompare}
                    diffSummary={diffSummary}
                    yearPresets={yearPresets}
                    customPrimaryStart={customPrimaryStart}
                    customPrimaryEnd={customPrimaryEnd}
                    customCompareStart={customCompareStart}
                    customCompareEnd={customCompareEnd}
                    tablesByDuration={tablesByDuration}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            )}
        </div>
    );
};

export default PowerTopTenByDurationPanel;
