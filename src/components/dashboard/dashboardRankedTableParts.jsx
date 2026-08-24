import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import DashboardTableScrollShell from './DashboardTableScrollShell';

export function RankedTableLinks({ activity, onOpenActivityInLog }) {
    const links = activity ? activityExternalLinks(activity) : [];
    return (
        <div className="flex flex-wrap justify-end gap-x-1.5 gap-y-0.5">
            {activity && typeof onOpenActivityInLog === 'function' && activity.id != null && (
                <button
                    type="button"
                    onClick={() => onOpenActivityInLog(activity.id)}
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
    );
}

export function RankedTableMobileCards({
    rows,
    peerRows,
    variant,
    onOpenActivityInLog,
    emptyHint,
    valueCompareClass,
    valueCompareTitle,
    getValue,
    formatValue,
}) {
    if (!rows?.length) {
        return <p className="text-xs text-cdmuted py-3 px-2">{emptyHint || 'No data.'}</p>;
    }

    return (
        <ul className="space-y-2">
            {rows.map((row, i) => {
                const peerRow = peerRows?.[i];
                const peerValue = peerRow ? getValue(peerRow) : null;
                const value = getValue(row);
                const vCls = peerRows ? valueCompareClass(value, peerValue) : 'text-cdtext';
                const vTitle = peerRows ? valueCompareTitle(value, peerValue) : undefined;

                return (
                    <li
                        key={`${row.activity?.id ?? i}-${value}`}
                        className="rounded-lg border border-cdborder bg-cdborder/10 p-3 space-y-2"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-cdmuted tabular-nums">
                                #{i + 1}
                            </span>
                            <span
                                className={`text-base font-bold tabular-nums ${vCls}`}
                                title={vTitle}
                            >
                                {formatValue(value)}
                                {variant === 'distance' && (
                                    <span className="text-xs font-normal text-cdmuted ml-0.5">km</span>
                                )}
                                {variant === 'power' && (
                                    <span className="text-xs font-normal text-cdmuted ml-0.5">W</span>
                                )}
                            </span>
                        </div>
                        <div className="text-sm font-medium text-cdtext leading-snug break-words">
                            {row.activity?.title || '—'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cdmuted">
                            <span className="whitespace-nowrap">
                                {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                            </span>
                            {variant === 'distance' && row.activity && (
                                <span className="tabular-nums whitespace-nowrap">
                                    {formatTime(row.activity.moving_time)}
                                </span>
                            )}
                        </div>
                        <div className="pt-1 border-t border-cdborder/40">
                            <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold mb-1">
                                Links
                            </div>
                            <RankedTableLinks activity={row.activity} onOpenActivityInLog={onOpenActivityInLog} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export function RankedTableDesktop({
    rows,
    peerRows,
    variant,
    onOpenActivityInLog,
    emptyHint,
    valueCompareClass,
    valueCompareTitle,
    getValue,
    formatValue,
}) {
    if (!rows?.length) {
        return <p className="text-xs text-cdmuted py-3 px-2">{emptyHint || 'No data.'}</p>;
    }

    return (
        <DashboardTableScrollShell>
            <table className="w-full text-left text-xs min-w-[340px]">
                <thead>
                    <tr className="bg-cdborder/40 text-cdmuted uppercase tracking-wide">
                        <th className="px-2 py-2 font-semibold w-8 sticky left-0 z-10 bg-cdborder/90">#</th>
                        <th className="px-2 py-2 font-semibold text-right whitespace-nowrap">
                            {variant === 'distance' ? 'km' : 'W'}
                        </th>
                        {variant === 'distance' && (
                            <th className="px-2 py-2 font-semibold whitespace-nowrap">Time</th>
                        )}
                        <th className="px-2 py-2 font-semibold whitespace-nowrap">Date</th>
                        <th className="px-2 py-2 font-semibold min-w-[120px]">Ride</th>
                        <th className="px-2 py-2 font-semibold text-right min-w-[88px] whitespace-nowrap">Links</th>
                    </tr>
                </thead>
                <tbody className="text-cdtext divide-y divide-cdborder/50">
                    {rows.map((row, i) => {
                        const peerRow = peerRows?.[i];
                        const peerValue = peerRow ? getValue(peerRow) : null;
                        const value = getValue(row);
                        const vCls = peerRows ? valueCompareClass(value, peerValue) : 'text-cdtext';
                        const vTitle = peerRows ? valueCompareTitle(value, peerValue) : undefined;

                        return (
                            <tr key={`${row.activity?.id ?? i}-${value}`} className="hover:bg-cdborder/15">
                                <td className="px-2 py-1.5 text-cdmuted tabular-nums sticky left-0 z-[1] bg-cdsurface">{i + 1}</td>
                                <td
                                    className={`px-2 py-1.5 text-right font-bold tabular-nums whitespace-nowrap ${vCls}`}
                                    title={vTitle}
                                >
                                    {formatValue(value)}
                                </td>
                                {variant === 'distance' && (
                                    <td className="px-2 py-1.5 text-cdmuted tabular-nums whitespace-nowrap">
                                        {row.activity ? formatTime(row.activity.moving_time) : '—'}
                                    </td>
                                )}
                                <td className="px-2 py-1.5 text-cdmuted whitespace-nowrap">
                                    {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                                </td>
                                <td className="px-2 py-1.5 min-w-[120px] max-w-[200px]">
                                    <span className="block truncate" title={row.activity?.title}>
                                        {row.activity?.title || '—'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 text-right min-w-[88px]">
                                    <RankedTableLinks
                                        activity={row.activity}
                                        onOpenActivityInLog={onOpenActivityInLog}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </DashboardTableScrollShell>
    );
}
