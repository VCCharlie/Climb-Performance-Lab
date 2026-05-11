import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from 'recharts';
import { formatNlNumber } from '../../utils/formatters';
import {
    formatDurationHoursMinutes,
    formatWeekChartTickEn,
    formatMonthChartTickEn,
    orderVolumeRowsChronological,
} from '../../utils/dashboardVolumeTotals';

const METRICS = [
    { id: 'distance', label: 'Distance', barValue: (r) => r.distanceKm },
    { id: 'time', label: 'Time', barValue: (r) => (Number(r.movingTimeSec) || 0) / 3600 },
    { id: 'elevation', label: 'Elev gain', barValue: (r) => r.elevationM },
    { id: 'load', label: 'Load (TSS)', barValue: (r) => r.load },
];

const pill = (active) =>
    `px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
        active
            ? 'bg-cdborder text-cdaccent border-cdaccent/60 shadow-sm'
            : 'bg-cdbg/50 text-cdmuted border-cdborder hover:text-cdtext hover:border-cdborder'
    }`;

/**
 * Strava-style bar chart: weekly or monthly buckets, metric toggles, summary for selected bar.
 */
const VolumeTotalsChart = ({ weeklyRows, monthlyRows }) => {
    const [cadence, setCadence] = useState('weekly');
    const [metricId, setMetricId] = useState('distance');
    const [selectedKey, setSelectedKey] = useState(null);

    const sourceRows = cadence === 'weekly' ? weeklyRows : monthlyRows;
    const chronological = useMemo(() => orderVolumeRowsChronological(sourceRows), [sourceRows]);

    const chartData = useMemo(() => {
        const m = METRICS.find((x) => x.id === metricId) || METRICS[0];
        return chronological.map((r) => ({
            ...r,
            barValue: Math.max(0, Number(m.barValue(r)) || 0),
            tick: cadence === 'weekly' ? formatWeekChartTickEn(r.key) : formatMonthChartTickEn(r.key),
        }));
    }, [chronological, metricId, cadence]);

    const selectedIndex = useMemo(() => {
        if (!chartData.length) return -1;
        if (selectedKey) {
            const i = chartData.findIndex((r) => r.key === selectedKey);
            if (i >= 0) return i;
        }
        return chartData.length - 1;
    }, [chartData, selectedKey]);

    const selected = selectedIndex >= 0 ? chartData[selectedIndex] : null;

    const yTickFormatter = (v) => {
        if (metricId === 'time') return `${Math.round(v * 10) / 10}h`;
        if (metricId === 'distance') return formatNlNumber(Math.round(v * 10) / 10);
        return formatNlNumber(Math.round(v));
    };

    const tooltipFormatter = (value) => {
        const v = Number(value) || 0;
        if (metricId === 'time') return [`${Math.round(v * 10) / 10} h`, 'Time'];
        if (metricId === 'distance') return [`${Math.round(v * 10) / 10} km`, 'Distance'];
        if (metricId === 'elevation') return [`${Math.round(v)} m`, 'Elevation'];
        return [`${Math.round(v)}`, 'Load (TSS)'];
    };

    const xInterval = chartData.length > 18 ? Math.max(0, Math.floor(chartData.length / 14)) : 0;

    if (!chartData.length) {
        return (
            <div className="rounded-xl border border-cdborder bg-cdsurface p-6 text-center text-cdmuted text-sm">
                Not enough data to plot this view.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-cdborder bg-cdsurface p-4 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-bold text-cdtext">Volume chart</h3>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Week or month">
                    <button type="button" className={pill(cadence === 'weekly')} onClick={() => setCadence('weekly')}>
                        Weekly
                    </button>
                    <button type="button" className={pill(cadence === 'monthly')} onClick={() => setCadence('monthly')}>
                        Monthly
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Metric">
                {METRICS.map((m) => (
                    <button key={m.id} type="button" className={pill(metricId === m.id)} onClick={() => setMetricId(m.id)}>
                        {m.label}
                    </button>
                ))}
            </div>

            {selected && (
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-4 py-3 text-center">
                    <p className="text-[11px] uppercase font-bold text-cdmuted mb-2">Totals for {selected.label}</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-cdtext">
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Distance</div>
                            <div className="font-mono font-bold tabular-nums">{formatNlNumber(selected.distanceKm)} km</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Time</div>
                            <div className="font-mono font-bold tabular-nums">{formatDurationHoursMinutes(selected.movingTimeSec)}</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Elevation</div>
                            <div className="font-mono font-bold tabular-nums">{formatNlNumber(selected.elevationM)} m</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Load</div>
                            <div className="font-mono font-bold tabular-nums text-blue-400/95">{formatNlNumber(selected.load)}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-[280px] w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.25} vertical={false} />
                        <XAxis
                            dataKey="tick"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            interval={xInterval}
                            angle={chartData.length > 10 ? -32 : 0}
                            textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                            height={chartData.length > 10 ? 52 : 28}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={yTickFormatter}
                            width={metricId === 'time' ? 44 : 36}
                        />
                        <Tooltip
                            contentStyle={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#f1f5f9',
                            }}
                            labelFormatter={(_, payload) => {
                                const p = payload?.[0]?.payload;
                                return p?.label || '';
                            }}
                            formatter={tooltipFormatter}
                        />
                        <Bar
                            dataKey="barValue"
                            radius={[4, 4, 0, 0]}
                            onClick={(_entry, index) => {
                                if (typeof index === 'number' && chartData[index]) {
                                    setSelectedKey(chartData[index].key);
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((_, i) => (
                                <Cell
                                    key={`cell-${i}`}
                                    fill={i === selectedIndex ? 'rgba(59, 130, 246, 0.95)' : 'rgba(59, 130, 246, 0.55)'}
                                    stroke={i === selectedIndex ? 'rgba(147, 197, 253, 0.9)' : 'transparent'}
                                    strokeWidth={i === selectedIndex ? 2 : 0}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-cdmuted text-center">
                Click a bar to pin that period. Bar height follows the selected metric; the summary always shows all four totals.
            </p>
        </div>
    );
};

export default VolumeTotalsChart;
