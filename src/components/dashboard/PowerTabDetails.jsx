import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import PowerCurveChart from './charts/PowerCurveChart';
import { formatDateDDMMYYYY } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClassLg } from '../../utils/chartTheme';
import useMediaQuery from '../../hooks/useMediaQuery';
import { RankedTableLinks } from './dashboardRankedTableParts';

const DURATION_LABELS = { a_5min: '5 min', b_20min: '20 min', c_60min: '60 min' };

function BestPowerPeriodMobileCards({ powerPeakRows, onOpenActivityInLog }) {
    return (
        <ul className="space-y-2 sm:hidden">
            {powerPeakRows.map((row) => (
                <li
                    key={row.key}
                    className="rounded-lg border border-cdborder bg-cdborder/10 p-3 space-y-2"
                >
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-cdtext">{row.label}</span>
                        <span className="text-lg font-mono font-bold text-cdtext tabular-nums">
                            {row.watts > 0 ? `${row.watts} W` : '—'}
                        </span>
                    </div>
                    {row.activity?.title && (
                        <p className="text-sm text-cdmuted leading-snug break-words">{row.activity.title}</p>
                    )}
                    <div className="text-[11px] text-cdmuted">
                        {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                    </div>
                    <div className="pt-1 border-t border-cdborder/40">
                        <div className="text-[9px] uppercase tracking-wide text-cdmuted font-bold mb-1">
                            Links
                        </div>
                        <RankedTableLinks activity={row.activity} onOpenActivityInLog={onOpenActivityInLog} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/**
 * Table of best powers by duration, monthly chart, and MMP curve — only rendered when period stats exist.
 */
const PowerTabDetails = ({ powerPeakRows, monthlyBests, data, manualFtp, onOpenActivityInLog }) => {
    const theme = getChartTheme();
    const isMobile = useMediaQuery('(max-width: 639px)');

    return (
    <>
        <div className={chartCardClassLg}>
            <h3 className="text-lg font-bold text-cdtext mb-1">Best powers in this period</h3>
            <p className="text-xs text-cdmuted mb-4">
                Strongest value per duration in your filtered data (same caps as the chart). Similar to the power view on{' '}
                <a href="https://intervals.icu/power" target="_blank" rel="noopener noreferrer" className="text-cdaccent hover:underline">
                    intervals.icu/power
                </a>
                .
            </p>

            {isMobile ? (
                <BestPowerPeriodMobileCards
                    powerPeakRows={powerPeakRows}
                    onOpenActivityInLog={onOpenActivityInLog}
                />
            ) : (
                <div className="overflow-x-auto rounded-lg border border-cdborder">
                    <table className="w-full text-sm text-left min-w-[420px]">
                        <thead>
                            <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                                <th className="px-3 py-2 font-semibold">Duration</th>
                                <th className="px-3 py-2 font-semibold text-right">Watts</th>
                                <th className="px-3 py-2 font-semibold">Date</th>
                                <th className="px-3 py-2 font-semibold">Activity</th>
                                <th className="px-3 py-2 font-semibold text-right">Links</th>
                            </tr>
                        </thead>
                        <tbody className="text-cdtext">
                            {powerPeakRows.map((row) => {
                                const links = row.activity ? activityExternalLinks(row.activity) : [];
                                return (
                                    <tr key={row.key} className="border-t border-cdborder">
                                        <td className="px-3 py-2 font-medium whitespace-nowrap">{row.label}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold">
                                            {row.watts > 0 ? row.watts : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-cdmuted text-xs whitespace-nowrap">
                                            {row.activity ? formatDateDDMMYYYY(row.activity.date) : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-cdmuted max-w-[200px] truncate" title={row.activity?.title}>
                                            {row.activity?.title || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {row.activity && typeof onOpenActivityInLog === 'function' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenActivityInLog(row.activity.id)}
                                                        className="text-xs font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                                                        title="Open in Activities log"
                                                    >
                                                        <ExternalLink size={12} /> Log
                                                    </button>
                                                )}
                                                {links.map((l) => (
                                                    <a
                                                        key={l.label}
                                                        href={l.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-bold text-cdmuted hover:text-cdaccent"
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
            )}
        </div>

        <div className={chartCardClassLg}>
            <h3 className="text-lg font-bold text-cdtext mb-4">Best monthly efforts (W)</h3>
            <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    <LineChart
                        data={monthlyBests}
                        margin={{ top: 5, right: isMobile ? 8 : 20, left: isMobile ? -8 : 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: isMobile ? 9 : 11 }}
                            interval={isMobile ? 'preserveStartEnd' : 0}
                            minTickGap={isMobile ? 16 : 30}
                            angle={isMobile ? -35 : 0}
                            textAnchor={isMobile ? 'end' : 'middle'}
                            height={isMobile ? 48 : 30}
                        />
                        <YAxis
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: isMobile ? 10 : 11 }}
                            width={isMobile ? 36 : 60}
                        />
                        <Tooltip
                            content={(props) => (
                                <ChartTooltip
                                    {...props}
                                    formatter={(value, name) => [
                                        value ? `${value} W` : '—',
                                        DURATION_LABELS[name] ?? name,
                                    ]}
                                />
                            )}
                            cursor={theme.cursor}
                        />
                        <Legend
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '12px', fontSize: isMobile ? '10px' : '12px' }}
                            formatter={(value) => DURATION_LABELS[value] ?? value}
                        />
                        <Line type="monotone" dataKey="a_5min" stroke={theme.blue} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                        <Line type="monotone" dataKey="b_20min" stroke={theme.primary} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                        <Line type="monotone" dataKey="c_60min" stroke={theme.green} strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <PowerCurveChart data={data} manualFtp={manualFtp} />
    </>
    );
};

export default PowerTabDetails;
