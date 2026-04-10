import React from 'react';
import {
    previousWindowBounds,
    boundsToYmdPair,
} from '../../utils/dashboardActivityWindow';
import { COMPARE_OPTIONS } from './powerTopTenByDurationConstants';
import { PeriodSummaryCard } from './powerTopTenByDurationUi';
import PowerTopTenCustomRanges from './PowerTopTenCustomRanges';
import PowerTopTenDurationTablesBlock from './PowerTopTenDurationTablesBlock';

const PowerTopTenExpandedBody = ({
    compareMode,
    setCompareMode,
    compareDays,
    setCompareDays,
    dashboardBounds,
    setCustomPrimaryStart,
    setCustomPrimaryEnd,
    setCustomCompareStart,
    setCustomCompareEnd,
    boundsPrimary,
    compareBounds,
    statsPrimary,
    statsCompare,
    diffSummary,
    yearPresets,
    customPrimaryStart,
    customPrimaryEnd,
    customCompareStart,
    customCompareEnd,
    tablesByDuration,
    onOpenActivityInLog,
}) => (
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
                    accentClass="border-cdaccent/40 bg-cdaccent/[0.07]"
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

        {compareBounds && (
            <p className="text-[10px] text-cdmuted leading-snug">
                <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/50 align-middle mr-1.5" aria-hidden />
                Meer watt op dezelfde rang (#1 vs #1, …) dan de andere kolom — hover op de watt-kolom voor details.
            </p>
        )}

        <PowerTopTenDurationTablesBlock
            tablesByDuration={tablesByDuration}
            compareBounds={compareBounds}
            onOpenActivityInLog={onOpenActivityInLog}
        />
    </div>
);

export default PowerTopTenExpandedBody;
