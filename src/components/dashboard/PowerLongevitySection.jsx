import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClass, chartSegmentToggleClass } from '../../utils/chartTheme';
import { formatNlNumber } from '../../utils/formatters';
import {
    computeYearlyPowerPeakRows,
    enrichYearlyPowerRowsWithAge,
    chartRowsForPowerLongevity,
    normalizeBirthYear,
} from '../../utils/powerTrendSeries';

const METRICS = [
    { id: 'eftp20', label: 'eFTP (20m)', color: 'rgba(34,197,94,0.85)', unit: 'W' },
    { id: 'best20min', label: 'Best 20 min', color: 'rgba(59,130,246,0.85)', unit: 'W' },
    { id: 'best60min', label: 'Best 60 min', color: 'rgba(168,85,247,0.85)', unit: 'W' },
];

/**
 * Yearly (or age-based) power peak chart + summary table on Power tab.
 */
export default function PowerLongevitySection({
    activities,
    manualFtp = 0,
    weightKg = 0,
    userSettings,
}) {
    const theme = getChartTheme();
    const birthYear = normalizeBirthYear(userSettings?.birthYear);
    const [metric, setMetric] = useState('eftp20');
    const [xMode, setXMode] = useState(birthYear ? 'age' : 'year');

    const yearlyRows = useMemo(
        () => computeYearlyPowerPeakRows(activities, manualFtp, weightKg),
        [activities, manualFtp, weightKg],
    );

    const enrichedRows = useMemo(
        () => enrichYearlyPowerRowsWithAge(yearlyRows, birthYear),
        [yearlyRows, birthYear],
    );

    const chartData = useMemo(() => {
        const mode = xMode === 'age' && birthYear ? 'age' : 'year';
        return chartRowsForPowerLongevity(enrichedRows, mode);
    }, [enrichedRows, xMode, birthYear]);

    const activeMetric = METRICS.find((m) => m.id === metric) || METRICS[0];
    const hasPowerYears = yearlyRows.some((r) => r.eftp20 || r.best60min);

    if (!hasPowerYears) return null;

    const xAxisLabel = xMode === 'age' && birthYear ? 'Age' : 'Year';

    return (
        <div className={chartCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-cdblue shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">
                            Long-term power trends
                        </h3>
                        <p className="text-[11px] text-cdmuted leading-snug">
                            Best peak per calendar year from your full ride history (not the period filter above).
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setXMode('year')}
                            className={chartSegmentToggleClass(xMode === 'year')}
                        >
                            By year
                        </button>
                        <button
                            type="button"
                            onClick={() => birthYear && setXMode('age')}
                            disabled={!birthYear}
                            className={`${chartSegmentToggleClass(xMode === 'age')} disabled:opacity-40`}
                        >
                            By age
                        </button>
                    </div>
                    <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden">
                        {METRICS.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMetric(m.id)}
                                className={chartSegmentToggleClass(metric === m.id)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {!birthYear && (
                <p className="text-[10px] text-cdmuted mb-3">
                    Set birth year in Settings to switch the chart to an age timeline.
                </p>
            )}

            <div className="h-56 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                        <XAxis
                            dataKey="xKey"
                            tick={theme.axisTick}
                            stroke={theme.axisStroke}
                            tickFormatter={(_v, idx) => chartData[idx]?.xLabel ?? ''}
                        />
                        <YAxis
                            tick={theme.axisTick}
                            stroke={theme.axisStroke}
                            width={44}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            content={(
                                <ChartTooltip
                                    labelFormatter={(_label, payload) => {
                                        const row = payload?.[0]?.payload;
                                        if (!row) return '';
                                        return xMode === 'age' && row.age != null
                                            ? `${row.year} · age ${row.age}`
                                            : String(row.year);
                                    }}
                                    formatter={(value) => `${formatNlNumber(value, 0)} ${activeMetric.unit}`}
                                />
                            )}
                        />
                        <Bar
                            dataKey={metric}
                            fill={activeMetric.color}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={48}
                        />
                        <Line
                            type="monotone"
                            dataKey={metric}
                            stroke={theme.primary}
                            strokeWidth={2}
                            dot={{ r: 3, fill: theme.primary }}
                            activeDot={{ r: 5 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-cdmuted mb-2">{xAxisLabel} · {activeMetric.label}</p>

            <div className="overflow-x-auto rounded-lg border border-cdborder/60">
                <table className="w-full text-xs text-left">
                    <thead className="bg-cdbg/50 text-cdmuted uppercase tracking-wide text-[10px]">
                        <tr>
                            <th className="px-3 py-2 font-bold">Year</th>
                            {birthYear && <th className="px-3 py-2 font-bold">Age</th>}
                            <th className="px-3 py-2 font-bold">eFTP</th>
                            <th className="px-3 py-2 font-bold">20 min</th>
                            <th className="px-3 py-2 font-bold">60 min</th>
                            <th className="px-3 py-2 font-bold">eFTP W/kg</th>
                            <th className="px-3 py-2 font-bold">Rides</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cdborder/40">
                        {[...enrichedRows].reverse().map((row) => (
                            <tr key={row.year} className="text-cdtext">
                                <td className="px-3 py-2 font-mono">{row.year}</td>
                                {birthYear && (
                                    <td className="px-3 py-2 font-mono text-cdmuted">
                                        {row.age ?? '—'}
                                    </td>
                                )}
                                <td className="px-3 py-2 font-mono">{row.eftp20 ?? '—'}</td>
                                <td className="px-3 py-2 font-mono">{row.best20min ?? '—'}</td>
                                <td className="px-3 py-2 font-mono">{row.best60min ?? '—'}</td>
                                <td className="px-3 py-2 font-mono">{row.eftpWkg ?? '—'}</td>
                                <td className="px-3 py-2 font-mono text-cdmuted">{row.rideCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
