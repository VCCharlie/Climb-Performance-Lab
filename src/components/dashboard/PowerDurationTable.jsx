import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
    POWER_DURATION_ROWS,
    powerCurveWithSources,
    filterActivitiesByDaysBeforeEnd,
    filterActivitiesCalendarYear,
    dashboardFilterLabel,
} from '../../utils/powerDurationTable';
import { formatDateDDMMYYYY } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';

const COL_STYLES = [
    { key: 'd42', label: '42 d', headerClass: 'bg-violet-600/90 text-white' },
    { key: 'd84', label: '84 d', headerClass: 'bg-fuchsia-600/90 text-white' },
    { key: 'd90', label: '90 d', headerClass: 'bg-orange-600/90 text-white' },
    { key: 'filter', label: null, headerClass: 'bg-emerald-600/90 text-white' },
    { key: 'season', label: null, headerClass: 'bg-lime-600/90 text-white' },
    { key: 'lastSeason', label: null, headerClass: 'bg-amber-500/90 text-slate-900' },
    { key: 'all', label: 'All', headerClass: 'bg-pink-600/90 text-white' },
];

/**
 * intervals.icu-style matrix: multiple time windows × duration × W and W/kg.
 */
const PowerDurationTable = ({
    chartData,
    filteredData,
    manualFtp,
    timeRange,
    referenceEndDate,
    weightKg = 0,
    onOpenActivityInLog,
}) => {
    /** Click popover: stays open until outside click or Escape */
    const [popover, setPopover] = useState(null);
    const popoverRef = useRef(null);

    const closePopover = useCallback(() => setPopover(null), []);

    useEffect(() => {
        if (!popover) return undefined;

        const onDocDown = (e) => {
            if (popoverRef.current?.contains(e.target)) return;
            if (e.target.closest?.('[data-power-duration-cell]')) return;
            closePopover();
        };
        const onKey = (e) => {
            if (e.key === 'Escape') closePopover();
        };

        document.addEventListener('mousedown', onDocDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [popover, closePopover]);

    const refEnd = useMemo(() => {
        if (referenceEndDate) return new Date(referenceEndDate);
        return new Date();
    }, [referenceEndDate]);

    const columns = useMemo(() => {
        const filterLabel = dashboardFilterLabel(timeRange);
        const y = refEnd.getFullYear();
        const prevY = y - 1;

        const d42 = filterActivitiesByDaysBeforeEnd(chartData, 42, refEnd);
        const d84 = filterActivitiesByDaysBeforeEnd(chartData, 84, refEnd);
        const d90 = filterActivitiesByDaysBeforeEnd(chartData, 90, refEnd);
        const allActs = chartData || [];
        const seasonActs = filterActivitiesCalendarYear(chartData, y);
        const lastSeasonActs = filterActivitiesCalendarYear(chartData, prevY);

        return COL_STYLES.map((c) => {
            let acts = [];
            let label = c.label;
            if (c.key === 'd42') acts = d42;
            else if (c.key === 'd84') acts = d84;
            else if (c.key === 'd90') acts = d90;
            else if (c.key === 'filter') {
                acts = filteredData || [];
                label = filterLabel;
            } else if (c.key === 'season') {
                acts = seasonActs;
                label = `Season ${y}`;
            } else if (c.key === 'lastSeason') {
                acts = lastSeasonActs;
                label = `Season ${prevY}`;
            } else acts = allActs;

            const curveWithSrc = powerCurveWithSources(acts, manualFtp);
            return { ...c, displayLabel: label, curveWithSrc, actCount: acts.length };
        });
    }, [chartData, filteredData, manualFtp, timeRange, refEnd]);

    const globalBest = useMemo(() => {
        const best = {};
        for (const row of POWER_DURATION_ROWS) {
            let maxW = 0;
            for (const col of columns) {
                const w = col.curveWithSrc[row.label]?.watts;
                if (w != null && w > maxW) maxW = w;
            }
            best[row.label] = maxW;
        }
        return best;
    }, [columns]);

    const wkg = (w) => {
        if (!w || weightKg <= 0) return null;
        return (w / weightKg).toFixed(2);
    };

    const toggleCellPopover = (e, cellKey, cell) => {
        if (!cell?.activity || cell.watts == null) return;
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const pad = 8;
        const popW = 288;

        if (popover?.cellKey === cellKey) {
            closePopover();
            return;
        }

        let left = rect.left + rect.width / 2 - popW / 2;
        left = Math.max(pad, Math.min(left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - popW - pad));

        let top = rect.bottom + pad;
        const maxH = 280;
        if (typeof window !== 'undefined' && top + maxH > window.innerHeight - pad) {
            top = Math.max(pad, rect.top - maxH - pad);
        }

        setPopover({
            cellKey,
            left,
            top,
            watts: cell.watts,
            durationLabel: cell.durationLabel,
            activity: cell.activity,
            links: activityExternalLinks(cell.activity),
        });
    };

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl overflow-visible relative">
            <h3 className="text-lg font-bold text-cdtext mb-1">Power-duration (intervals.icu-style)</h3>
            <p className="text-xs text-cdmuted mb-4 max-w-3xl leading-relaxed">
                Layout similar to{' '}
                <a href="https://intervals.icu/power" target="_blank" rel="noopener noreferrer" className="text-cdaccent hover:underline">
                    intervals.icu/power
                </a>
                : several time windows side by side. Per ride: max power, best 1/5/10/20/60 min (and 90/120 when the API provides them),
                plus for long rides an anchor at ride duration with average/NP — intermediate
                durations are <strong className="text-cdtext">estimated</strong> (log interpolation). Blue = best value in the table for that
                duration. Without body weight in Settings we do not show W/kg. <strong className="text-cdtext">Click</strong> a cell for the
                source ride; scroll in the popover for links. Close with a click outside or <kbd className="px-1 rounded bg-cdborder text-[10px]">Esc</kbd>.
            </p>

            {popover?.activity && (
                <div
                    ref={popoverRef}
                    data-power-duration-popover=""
                    role="dialog"
                    aria-label="Source ride"
                    className="fixed z-[200] w-72 max-h-[min(320px,70vh)] flex flex-col rounded-lg border border-cdborder bg-cdsurface shadow-2xl text-left text-xs"
                    style={{ left: popover.left, top: popover.top }}
                >
                    <div className="p-3 border-b border-cdborder shrink-0">
                        <div className="font-bold text-cdtext text-sm mb-1 line-clamp-2" title={popover.activity.title}>
                            {popover.activity.title || 'Untitled'}
                        </div>
                        <div className="text-cdmuted mb-1">{formatDateDDMMYYYY(popover.activity.date)}</div>
                        <div className="text-cdaccent font-mono">
                            ~{popover.watts} W @ {popover.durationLabel} (estimated)
                        </div>
                    </div>
                    <div className="p-2 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                        <div className="text-[10px] uppercase text-cdmuted font-bold tracking-wide mb-2 px-1">Links</div>
                        <ul className="space-y-2">
                            {typeof onOpenActivityInLog === 'function' && popover.activity.id != null && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onOpenActivityInLog(popover.activity.id);
                                            closePopover();
                                        }}
                                        className="w-full text-left px-2 py-2 rounded-md bg-cdborder/40 hover:bg-cdborder text-cdtext font-bold text-xs"
                                    >
                                        Open in Activities log
                                    </button>
                                </li>
                            )}
                            {popover.links.map((l) => (
                                <li key={l.label}>
                                    <a
                                        href={l.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-2 py-2 rounded-md bg-cdborder/20 hover:bg-cdborder/50 text-blue-400 font-bold text-xs"
                                    >
                                        {l.label} →
                                    </a>
                                </li>
                            ))}
                            {popover.links.length === 0 &&
                                !(typeof onOpenActivityInLog === 'function' && popover.activity.id != null) && (
                                    <li className="text-cdmuted px-2 py-2">No external links (e.g. CSV import).</li>
                                )}
                        </ul>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-cdborder -mx-1">
                <table className="w-full text-xs text-center border-collapse min-w-[900px]">
                    <thead>
                        <tr>
                            <th
                                rowSpan={2}
                                className="sticky left-0 z-20 bg-cdborder/80 text-cdtext font-bold px-2 py-2 text-left border-b border-r border-cdborder"
                            >
                                Duration
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    colSpan={2}
                                    className={`px-1 py-2 font-bold border-b border-cdborder ${col.headerClass}`}
                                >
                                    {col.displayLabel}
                                    <span className="block font-normal text-[10px] opacity-90 mt-0.5">
                                        {col.actCount} ride{col.actCount !== 1 ? 's' : ''}
                                    </span>
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {columns.map((col) => (
                                <React.Fragment key={`${col.key}-sub`}>
                                    <th className={`${col.headerClass} px-1 py-1 border-b border-cdborder/50 font-semibold`}>W</th>
                                    <th className={`${col.headerClass} px-1 py-1 border-b border-r border-cdborder/50 font-semibold`}>
                                        W/kg
                                    </th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-cdtext">
                        {POWER_DURATION_ROWS.map((row) => (
                            <tr key={row.label} className="border-b border-cdborder/40 hover:bg-cdborder/20">
                                <td className="sticky left-0 z-10 bg-cdsurface font-mono font-semibold text-left px-2 py-1 border-r border-cdborder">
                                    {row.label}
                                </td>
                                {columns.map((col) => {
                                    const cell = col.curveWithSrc[row.label];
                                    const watts = cell?.watts ?? null;
                                    const isPb = watts != null && globalBest[row.label] > 0 && watts === globalBest[row.label];
                                    const wClass = isPb ? 'text-blue-400 font-bold' : 'text-cdtext';
                                    const wkgVal = wkg(watts);
                                    const tipPayload =
                                        watts != null && cell?.activity
                                            ? { watts, durationLabel: row.label, activity: cell.activity }
                                            : null;
                                    const cellKey = `${col.key}-${row.label}`;
                                    const isOpen = popover?.cellKey === cellKey;
                                    return (
                                        <td
                                            key={cellKey}
                                            colSpan={2}
                                            data-power-duration-cell={tipPayload ? '' : undefined}
                                            role={tipPayload ? 'button' : undefined}
                                            tabIndex={tipPayload ? 0 : undefined}
                                            onClick={tipPayload ? (e) => toggleCellPopover(e, cellKey, tipPayload) : undefined}
                                            onKeyDown={
                                                tipPayload
                                                    ? (e) => {
                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                              e.preventDefault();
                                                              toggleCellPopover(e, cellKey, tipPayload);
                                                          }
                                                      }
                                                    : undefined
                                            }
                                            className={`px-1 py-1 border-r border-cdborder/30 ${
                                                tipPayload ? 'cursor-pointer hover:bg-cdborder/30 focus:outline-none focus:ring-2 focus:ring-cdaccent/50' : ''
                                            } ${isOpen ? 'ring-2 ring-cdaccent/60 bg-cdborder/20' : ''}`}
                                        >
                                            <div className="flex items-center justify-center gap-3 font-mono tabular-nums">
                                                <span className={wClass}>{watts != null ? watts : '—'}</span>
                                                <span className={`${wClass} text-cdmuted/80`}>|</span>
                                                <span className={wClass}>{wkgVal ?? '—'}</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PowerDurationTable;
