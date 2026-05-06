import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatDateDDMMYYYY, formatNlNumber } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import { formatLongRange } from './powerTopTenByDurationConstants';

export const PeriodSummaryCard = ({
    title,
    accentClass,
    bounds,
    stats,
    showRideAverages = false,
}) => (
    <div className={`rounded-lg border p-3 ${accentClass}`}>
        <div className="text-[10px] font-bold uppercase text-cdmuted mb-1">{title}</div>
        <p className="text-xs text-cdtext font-medium leading-snug mb-3">{bounds ? formatLongRange(bounds) : '—'}</p>
        <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
            <div>
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Rides</div>
                <div className="text-sm font-mono font-bold text-cdtext tabular-nums">{formatNlNumber(stats.rideCount)}</div>
            </div>
            <div>
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Distance</div>
                <div className="text-sm font-mono font-bold text-cdtext tabular-nums">
                    {formatNlNumber(Math.round(stats.distanceKm * 10) / 10)} km
                </div>
            </div>
            <div>
                <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Elevation</div>
                <div className="text-sm font-mono font-bold text-cdtext tabular-nums">{formatNlNumber(stats.elevationM)} m</div>
            </div>
        </div>
        {showRideAverages && (
            <div className="grid grid-cols-2 gap-2 text-center sm:text-left mt-2 pt-2 border-t border-cdborder/40">
                <div>
                    <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Avg distance</div>
                    <div className="text-sm font-mono font-bold text-cdtext tabular-nums">
                        {stats.avgDistanceKm != null && stats.rideCount > 0
                            ? `${formatNlNumber(Math.round(stats.avgDistanceKm * 10) / 10)} km`
                            : '—'}
                    </div>
                </div>
                <div>
                    <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold">Avg speed</div>
                    <div className="text-sm font-mono font-bold text-cdtext tabular-nums">
                        {stats.avgSpeedKmh != null
                            ? `${formatNlNumber(Math.round(stats.avgSpeedKmh * 10) / 10)} km/h`
                            : '—'}
                    </div>
                </div>
            </div>
        )}
    </div>
);

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
    if (w > p) return `Higher than the other period at this rank (${p} W)`;
    if (w < p) return `Lower than the other period at this rank (${p} W)`;
    return 'Tied at this rank';
};

export const TopTable = ({ rows, peerRows, onOpenActivityInLog, emptyHint }) => {
    if (!rows?.length) {
        return (
            <p className="text-xs text-cdmuted py-3 px-2">{emptyHint || 'No data.'}</p>
        );
    }
    return (
        <div className="overflow-x-auto rounded-lg border border-cdborder">
            <table className="w-full text-left text-xs min-w-[280px]">
                <thead>
                    <tr className="bg-cdborder/40 text-cdmuted uppercase tracking-wide">
                        <th className="px-2 py-2 font-semibold w-8">#</th>
                        <th className="px-2 py-2 font-semibold text-right">W</th>
                        <th className="px-2 py-2 font-semibold whitespace-nowrap">Date</th>
                        <th className="px-2 py-2 font-semibold min-w-[100px]">Ride</th>
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
                                                rel="noopener noreferrer"
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
