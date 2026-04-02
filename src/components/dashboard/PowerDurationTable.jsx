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
    { key: 'all', label: 'Alles', headerClass: 'bg-pink-600/90 text-white' },
];

/**
 * intervals.icu/power-achtige matrix: meerdere tijdvensters × duur × W en W/kg.
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
    const [hoverTip, setHoverTip] = useState(null);
    const hideTimerRef = useRef(null);

    const clearHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const hideTip = useCallback(() => {
        clearHideTimer();
        setHoverTip(null);
    }, [clearHideTimer]);

    const scheduleHideTip = useCallback(() => {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => setHoverTip(null), 220);
    }, [clearHideTimer]);

    useEffect(() => () => clearHideTimer(), [clearHideTimer]);

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
                label = `Seizoen ${y}`;
            } else if (c.key === 'lastSeason') {
                acts = lastSeasonActs;
                label = `Seizoen ${prevY}`;
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

    const showCellTip = (e, cell) => {
        if (!cell?.activity || cell.watts == null) {
            setHoverTip(null);
            return;
        }
        setHoverTip({
            x: e.clientX,
            y: e.clientY,
            watts: cell.watts,
            durationLabel: cell.durationLabel,
            activity: cell.activity,
            links: activityExternalLinks(cell.activity),
        });
    };

    const moveTip = (e) => {
        setHoverTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
    };

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl overflow-hidden relative">
            <h3 className="text-lg font-bold text-cdtext mb-1">Power-duration (intervals.icu-stijl)</h3>
            <p className="text-xs text-cdmuted mb-4 max-w-3xl leading-relaxed">
                Vergelijkbare opzet als{' '}
                <a href="https://intervals.icu/power" target="_blank" rel="noreferrer" className="text-cdaccent hover:underline">
                    intervals.icu/power
                </a>
                : meerdere tijdvensters naast elkaar. We hebben per rit alleen max power en beste 1/5/10/20/60 min — tussenliggende
                duur wordt <strong className="text-cdtext">geschat</strong> (log-interpolatie). Blauw = beste waarde in de tabel voor die
                duur. Zonder lichaamsgewicht in Instellingen tonen we geen W/kg. <strong className="text-cdtext">Hover</strong> over W of W/kg
                om de <strong className="text-cdtext">bronrit</strong> te zien.
            </p>

            {hoverTip?.activity && (
                <div
                    role="tooltip"
                    className="fixed z-[200] max-w-xs rounded-lg border border-cdborder bg-cdsurface shadow-2xl p-3 text-left text-xs"
                    style={{
                        left: Math.min(hoverTip.x + 14, typeof window !== 'undefined' ? window.innerWidth - 280 : 0),
                        top: Math.min(hoverTip.y + 14, typeof window !== 'undefined' ? window.innerHeight - 200 : 0),
                    }}
                    onMouseEnter={clearHideTimer}
                    onMouseLeave={hideTip}
                >
                    <div className="font-bold text-cdtext text-sm mb-1 truncate" title={hoverTip.activity.title}>
                        {hoverTip.activity.title || 'Zonder titel'}
                    </div>
                    <div className="text-cdmuted mb-1">{formatDateDDMMYYYY(hoverTip.activity.date)}</div>
                    <div className="text-cdaccent font-mono mb-2">
                        ~{hoverTip.watts} W @ {hoverTip.durationLabel} (geschat)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {typeof onOpenActivityInLog === 'function' && hoverTip.activity.id != null && (
                            <button
                                type="button"
                                onClick={() => onOpenActivityInLog(hoverTip.activity.id)}
                                className="text-[11px] font-bold text-cdaccent hover:underline"
                            >
                                Activiteiten
                            </button>
                        )}
                        {hoverTip.links.map((l) => (
                            <a
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-blue-400 hover:underline"
                            >
                                {l.label}
                            </a>
                        ))}
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
                                Tijd
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    colSpan={2}
                                    className={`px-1 py-2 font-bold border-b border-cdborder ${col.headerClass}`}
                                >
                                    {col.displayLabel}
                                    <span className="block font-normal text-[10px] opacity-90 mt-0.5">
                                        {col.actCount} rit{col.actCount !== 1 ? 'en' : ''}
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
                                    const cellHandlers = tipPayload
                                        ? {
                                              onMouseEnter: (e) => showCellTip(e, tipPayload),
                                              onMouseMove: moveTip,
                                              onMouseLeave: scheduleHideTip,
                                          }
                                        : {};
                                    return (
                                        <React.Fragment key={`${col.key}-${row.label}`}>
                                            <td
                                                className={`px-1 py-1 font-mono tabular-nums ${wClass} ${tipPayload ? 'cursor-help' : ''}`}
                                                {...cellHandlers}
                                            >
                                                {watts != null ? watts : '—'}
                                            </td>
                                            <td
                                                className={`px-1 py-1 font-mono tabular-nums border-r border-cdborder/30 ${wClass} ${tipPayload ? 'cursor-help' : ''}`}
                                                {...cellHandlers}
                                            >
                                                {wkgVal ?? '—'}
                                            </td>
                                        </React.Fragment>
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
