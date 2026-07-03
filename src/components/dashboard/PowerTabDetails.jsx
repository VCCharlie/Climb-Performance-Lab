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

const DURATION_LABELS = { a_5min: '5 min', b_20min: '20 min', c_60min: '60 min' };

/**
 * Table of best powers by duration, monthly chart, and MMP curve — only rendered when period stats exist.
 */
const PowerTabDetails = ({ powerPeakRows, monthlyBests, data, manualFtp, onOpenActivityInLog }) => {
    const theme = getChartTheme();

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
            <div className="overflow-x-auto rounded-lg border border-cdborder">
                <table className="w-full text-sm text-left min-w-[480px]">
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
        </div>

        <div className={chartCardClassLg}>
            <h3 className="text-lg font-bold text-cdtext mb-4">Best monthly efforts (W)</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={monthlyBests}
                        margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: 11 }}
                            interval={0}
                            minTickGap={30}
                        />
                        <YAxis stroke={theme.axis} tick={{ fill: theme.axis, fontSize: 11 }} />
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
                            wrapperStyle={{ paddingTop: '16px' }}
                            formatter={(value) => DURATION_LABELS[value] ?? value}
                        />
                        <Line type="monotone" dataKey="a_5min" stroke={theme.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="b_20min" stroke={theme.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="c_60min" stroke={theme.green} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <PowerCurveChart data={data} manualFtp={manualFtp} />
    </>
    );
};

export default PowerTabDetails;
