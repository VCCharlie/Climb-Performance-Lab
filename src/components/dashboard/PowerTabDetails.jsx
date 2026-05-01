import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import PowerCurveChart from './charts/PowerCurveChart';
import { formatDateDDMMYYYY } from '../../utils';
import { activityExternalLinks } from '../../utils/dashboardActivityPeaks';

/**
 * Tabel beste vermogens per vaste duur, maandgrafiek en MMP-curve — alleen gerenderd als er periodestats zijn.
 */
const PowerTabDetails = ({ powerPeakRows, monthlyBests, data, manualFtp, onOpenActivityInLog }) => (
    <>
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-cdtext mb-1">Beste vermogens in deze periode</h3>
            <p className="text-xs text-cdmuted mb-4">
                Per duur de sterkste waarde in je gefilterde data (zelfde plafonds als de grafiek). Vergelijkbaar met het power-overzicht op{' '}
                <a href="https://intervals.icu/power" target="_blank" rel="noopener noreferrer" className="text-cdaccent hover:underline">
                    intervals.icu/power
                </a>
                .
            </p>
            <div className="overflow-x-auto rounded-lg border border-cdborder">
                <table className="w-full text-sm text-left min-w-[480px]">
                    <thead>
                        <tr className="bg-cdborder/40 text-cdmuted text-xs uppercase">
                            <th className="px-3 py-2 font-semibold">Duur</th>
                            <th className="px-3 py-2 font-semibold text-right">Watt</th>
                            <th className="px-3 py-2 font-semibold">Datum</th>
                            <th className="px-3 py-2 font-semibold">Activiteit</th>
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
                                                    title="Ga naar Activiteiten-log"
                                                >
                                                    <ExternalLink size={12} /> Log
                                                </button>
                                            )}
                                            {links.map((l) => (
                                                <a
                                                    key={l.label}
                                                    href={l.href}
                                                    target="_blank" rel="noopener noreferrer"
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

        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-cdtext mb-4">Best efforts per maand (W)</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={monthlyBests}
                        margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                            interval={0}
                            minTickGap={30}
                        />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#94a3b8' }}
                            formatter={(value, name) => {
                                const labels = { 'a_5min': '5 min', 'b_20min': '20 min', 'c_60min': '60 min' };
                                return [value ? `${value} W` : '-', labels[name] ?? name];
                            }}
                        />
                        <Legend
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '16px' }}
                            formatter={(value) => {
                                const labels = { 'a_5min': '5 min', 'b_20min': '20 min', 'c_60min': '60 min' };
                                return labels[value] ?? value;
                            }}
                        />
                        <Line type="monotone" dataKey="a_5min"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="b_20min" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="c_60min" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <PowerCurveChart data={data} manualFtp={manualFtp} />
    </>
);

export default PowerTabDetails;
