import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatDateDDMMYYYY, formatNlNumber, formatTime } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';

const kmCompareClass = (km, peerKm) => {
    const k = Number(km) || 0;
    const p = peerKm != null ? Number(peerKm) : NaN;
    if (!k || Number.isNaN(p) || p <= 0) return 'text-cdtext';
    if (k > p) return 'text-emerald-400/95 bg-emerald-500/[0.08] rounded px-1.5 -mx-0.5';
    if (k < p) return 'text-cdmuted/80';
    return 'text-cdtext';
};

const kmCompareTitle = (km, peerKm) => {
    const k = Number(km) || 0;
    const p = peerKm != null ? Number(peerKm) : NaN;
    if (!k || Number.isNaN(p) || p <= 0) return undefined;
    if (k > p) return `Longer ride at this rank (${formatNlNumber(p, { maximumFractionDigits: 1 })} km)`;
    if (k < p) return `Shorter ride at this rank (${formatNlNumber(p, { maximumFractionDigits: 1 })} km)`;
    return 'Same distance at this rank';
};

/**
 * @param {{ activity: object, km: number }[]} rows
 * @param {{ activity: object, km: number }[] | null} peerRows - same rank index for comparison highlight
 */
export default function LongestRidesTable({ rows, peerRows, onOpenActivityInLog, emptyHint }) {
    if (!rows?.length) {
        return <p className="text-xs text-cdmuted py-3 px-2">{emptyHint || 'No rides with distance in this period.'}</p>;
    }
    return (
        <div className="overflow-x-auto rounded-lg border border-cdborder">
            <table className="w-full text-left text-xs min-w-[280px]">
                <thead>
                    <tr className="bg-cdborder/40 text-cdmuted uppercase tracking-wide">
                        <th className="px-2 py-2 font-semibold w-8">#</th>
                        <th className="px-2 py-2 font-semibold text-right">km</th>
                        <th className="px-2 py-2 font-semibold whitespace-nowrap">Time</th>
                        <th className="px-2 py-2 font-semibold whitespace-nowrap">Date</th>
                        <th className="px-2 py-2 font-semibold min-w-[100px]">Ride</th>
                        <th className="px-2 py-2 font-semibold text-right w-24">Links</th>
                    </tr>
                </thead>
                <tbody className="text-cdtext divide-y divide-cdborder/50">
                    {rows.map((row, i) => {
                        const links = row.activity ? activityExternalLinks(row.activity) : [];
                        const peerKm = peerRows?.[i]?.km;
                        const kCls = peerRows ? kmCompareClass(row.km, peerKm) : 'text-cdtext';
                        const kTitle = peerRows ? kmCompareTitle(row.km, peerKm) : undefined;
                        return (
                            <tr key={`${row.activity?.id ?? i}-${row.km}`} className="hover:bg-cdborder/15">
                                <td className="px-2 py-1.5 text-cdmuted font-mono">{i + 1}</td>
                                <td
                                    className={`px-2 py-1.5 text-right font-mono font-bold tabular-nums ${kCls}`}
                                    title={kTitle}
                                >
                                    {formatNlNumber(Math.round(row.km * 10) / 10, { maximumFractionDigits: 1 })}
                                </td>
                                <td className="px-2 py-1.5 text-cdmuted font-mono whitespace-nowrap">
                                    {row.activity ? formatTime(row.activity.moving_time) : '—'}
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
}
