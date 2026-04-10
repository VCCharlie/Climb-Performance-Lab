import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Zap } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import {
    dashboardFilterLabel,
    topNInterpolatedAtSec,
} from '../../utils/powerDurationTable';
import {
    getDashboardWindowBounds,
    filterActivitiesInBounds,
    previousWindowBounds,
    compareDaysBeforeWindow,
} from '../../utils/dashboardActivityWindow';

const DURATION_TARGETS = [
    { sec: 60, label: '1 min' },
    { sec: 300, label: '5 min' },
    { sec: 600, label: '10 min' },
    { sec: 1200, label: '20 min' },
    { sec: 3600, label: '60 min' },
    { sec: 7200, label: '120 min' },
];

const COMPARE_OPTIONS = [
    { value: 'none', label: 'Geen vergelijking' },
    { value: 'previous', label: 'Vorige even lange periode' },
    { value: 'days', label: 'Voorgaande N dagen' },
];

function formatShortRange(bounds) {
    if (!bounds) return '';
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    const a = bounds.start.toLocaleDateString('nl-NL', opts);
    const b = bounds.end.toLocaleDateString('nl-NL', opts);
    return `${a} – ${b}`;
}

/** Per rang (#1 t/m #10): subtiel markeer welke kolom meer watt heeft. */
const wattCompareClass = (watts, peerWatts) => {
    const w = Number(watts) || 0;
    const p = peerWatts != null ? Number(peerWatts) : NaN;
    if (!w || Number.isNaN(p) || p <= 0) return 'text-cdtext';
    if (w > p) return 'text-emerald-400/95 bg-emerald-500/[0.08] rounded px-1.5 -mx-0.5';
    if (w < p) return 'text-cdmuted/80';
    return 'text-cdtext';
};

const wattCompareTitle = (watts, peerWatts) => {
    const w = Number(watts) || 0;
    const p = peerWatts != null ? Number(peerWatts) : NaN;
    if (!w || Number.isNaN(p) || p <= 0) return undefined;
    if (w > p) return `Hoger dan de andere periode op deze rang (${p} W)`;
    if (w < p) return `Lager dan de andere periode op deze rang (${p} W)`;
    return 'Gelijk op deze rang';
};

const TopTable = ({ rows, peerRows, onOpenActivityInLog, emptyHint }) => {
    if (!rows?.length) {
        return (
            <p className="text-xs text-cdmuted py-3 px-2">{emptyHint || 'Geen data.'}</p>
        );
    }
    return (
        <div className="overflow-x-auto rounded-lg border border-cdborder">
            <table className="w-full text-left text-xs min-w-[280px]">
                <thead>
                    <tr className="bg-cdborder/40 text-cdmuted uppercase tracking-wide">
                        <th className="px-2 py-2 font-semibold w-8">#</th>
                        <th className="px-2 py-2 font-semibold text-right">W</th>
                        <th className="px-2 py-2 font-semibold whitespace-nowrap">Datum</th>
                        <th className="px-2 py-2 font-semibold min-w-[100px]">Rit</th>
                        <th className="px-2 py-2 font-semibold text-right w-24">Links</th>
                    </tr>
                </thead>
                <tbody className="text-cdtext divide-y divide-cdborder/50">
                    {rows.map((row, i) => {
                        const links = row.activity ? activityExternalLinks(row.activity) : [];
                        const peerW = peerRows?.[i]?.watts;
                        const wCls = peerRows ? wattCompareClass(row.watts, peerW) : 'text-cdtext';
                        const wTitle = peerRows ? wattCompareTitle(row.watts, peerW) : undefined;
                        return (
                            <tr key={`${row.activity?.id ?? i}-${row.watts}`} className="hover:bg-cdborder/15">
                                <td className="px-2 py-1.5 text-cdmuted font-mono">{i + 1}</td>
                                <td
                                    className={`px-2 py-1.5 text-right font-mono font-bold tabular-nums ${wCls}`}
                                    title={wTitle}
                                >
                                    {row.watts}
                                </td>
                                <td className="px-2 py-1.5 text-cdmuted whitespace-nowrap">
                                    {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                                </td>
                                <td className="px-2 py-1.5 max-w-[140px] sm:max-w-[200px]">
                                    <span className="block truncate" title={row.activity?.title}>
                                        {row.activity?.title || '—'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                    <div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
                                        {row.activity && typeof onOpenActivityInLog === 'function' && row.activity.id != null && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenActivityInLog(row.activity.id)}
                                                className="text-[10px] font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                                            >
                                                <ExternalLink size={10} /> Log
                                            </button>
                                        )}
                                        {links.map((l) => (
                                            <a
                                                key={l.label}
                                                href={l.href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-bold text-cdmuted hover:text-cdaccent"
                                            >
                                                {l.label}
                                            </a>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

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

    const bounds = useMemo(
        () => getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate),
        [timeRange, customStart, customEnd, referenceEndDate],
    );

    const currentActs = useMemo(() => filterActivitiesInBounds(chartData, bounds), [chartData, bounds]);

    const compareBounds = useMemo(() => {
        if (!bounds || compareMode === 'none') return null;
        if (compareMode === 'previous') return previousWindowBounds(bounds);
        if (compareMode === 'days' && compareDays > 0) return compareDaysBeforeWindow(bounds, compareDays);
        return null;
    }, [bounds, compareMode, compareDays]);

    const compareActs = useMemo(
        () => (compareBounds ? filterActivitiesInBounds(chartData, compareBounds) : []),
        [chartData, compareBounds],
    );

    const periodLabel = dashboardFilterLabel(timeRange);
    const currentRangeLabel = bounds ? formatShortRange(bounds) : '';
    const compareRangeLabel = compareBounds ? formatShortRange(compareBounds) : '';

    const tablesByDuration = useMemo(() => {
        return DURATION_TARGETS.map(({ sec, label }) => {
            const primary = topNInterpolatedAtSec(currentActs, manualFtp, sec, 10);
            const secondary = compareBounds ? topNInterpolatedAtSec(compareActs, manualFtp, sec, 10) : null;
            return { sec, label, primary, secondary };
        });
    }, [currentActs, compareActs, compareBounds, manualFtp]);

    if (!chartData?.length || !bounds) return null;

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
                        Geïnterpoleerd vermogen (zelfde methode als de power-duration matrix) voor{' '}
                        <span className="text-cdtext font-medium">{periodLabel}</span>
                        {currentRangeLabel && (
                            <>
                                {' '}
                                <span className="text-cdmuted">({currentRangeLabel})</span>
                            </>
                        )}
                        . Per duur: de 10 sterkste ritten in dat venster.
                    </p>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-cdborder/60">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 pt-3">
                        <label className="flex flex-col gap-1 text-xs text-cdmuted min-w-[200px]">
                            <span className="font-semibold text-cdtext">Vergelijk met</span>
                            <select
                                value={compareMode}
                                onChange={(e) => setCompareMode(e.target.value)}
                                className="bg-cdborder/30 border border-cdborder rounded-lg px-2 py-2 text-cdtext text-sm"
                            >
                                {COMPARE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                        {compareMode === 'days' && (
                            <label className="flex flex-col gap-1 text-xs text-cdmuted w-full sm:w-32">
                                <span className="font-semibold text-cdtext">Dagen</span>
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
                        {compareBounds && (
                            <p className="text-[11px] text-cdmuted sm:flex-1 sm:min-w-[200px] leading-snug">
                                Vergelijkingsvenster: <span className="text-cdtext">{compareRangeLabel}</span>
                                {' '}({compareActs.length} rit{compareActs.length !== 1 ? 'en' : ''})
                            </p>
                        )}
                    </div>
                    {compareBounds && (
                        <p className="text-[10px] text-cdmuted leading-snug">
                            <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/50 align-middle mr-1.5" aria-hidden />
                            Meer watt op dezelfde rang (#1 vs #1, …) dan de andere kolom — hover op de watt-kolom voor details.
                        </p>
                    )}

                    <div className="space-y-6">
                        {tablesByDuration.map(({ label, primary, secondary }) => (
                            <div key={label}>
                                <h4 className="text-sm font-bold text-cdaccent mb-2">{label}</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase text-cdmuted font-bold tracking-wide mb-1.5">
                                            Huidige periode
                                        </p>
                                        <TopTable
                                            rows={primary}
                                            peerRows={secondary}
                                            onOpenActivityInLog={onOpenActivityInLog}
                                            emptyHint="Geen ritten met power in dit venster."
                                        />
                                    </div>
                                    {compareBounds ? (
                                        <div>
                                            <p className="text-[10px] uppercase text-cdmuted font-bold tracking-wide mb-1.5">
                                                Vergelijking
                                            </p>
                                            <TopTable
                                                rows={secondary}
                                                peerRows={primary}
                                                onOpenActivityInLog={onOpenActivityInLog}
                                                emptyHint="Geen ritten in vergelijkingsvenster."
                                            />
                                        </div>
                                    ) : (
                                        <div className="hidden lg:block rounded-lg border border-dashed border-cdborder/60 p-4 text-xs text-cdmuted">
                                            Kies een vergelijking om hier een tweede kolom te zien.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PowerTopTenByDurationPanel;
