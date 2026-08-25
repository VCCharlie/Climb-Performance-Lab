import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { History } from 'lucide-react';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClass, chartSegmentToggleClass } from '../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import { computeMultiYearYtdAtSameMoment, multiYearChartSeries } from '../../utils/multiYearSameMoment';
import { formatNlNumber } from '../../utils/formatters';

const METRICS = [
    { id: 'distanceKm', label: 'Distance', unit: 'km', color: 'rgba(59,130,246,0.8)' },
    { id: 'elevationM', label: 'Elevation', unit: 'm', color: 'rgba(34,197,94,0.8)' },
    { id: 'movingTimeSec', label: 'Time', unit: 'h', color: 'rgba(168,85,247,0.8)' },
    { id: 'load', label: 'TSS', unit: 'TSS', color: 'rgba(249,115,22,0.8)' },
];

const LOCALE = 'en-GB';

function formatMetricValue(metricId, value) {
    if (metricId === 'movingTimeSec') {
        const h = Number(value) || 0;
        return h >= 10 ? h.toFixed(1) : h.toFixed(2);
    }
    if (metricId === 'distanceKm') {
        return formatNlNumber(value, 1);
    }
    return formatNlNumber(Math.round(value), 0);
}

/**
 * Multi-year YTD bars at the same calendar moment.
 */
const MultiYearCompareChart = ({ activities }) => {
    const [metric, setMetric] = useState('distanceKm');
    const theme = getChartTheme();

    const rows = useMemo(
        () => computeMultiYearYtdAtSameMoment(activities, new Date()),
        [activities],
    );

    const chartData = useMemo(
        () => multiYearChartSeries(rows, metric),
        [rows, metric],
    );

    const activeMetric = METRICS.find((m) => m.id === metric) || METRICS[0];
    const refLabel = new Date().toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });

    if (!rows.length) return null;

    return (
        <div className={chartCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2">
                    <History className="w-5 h-5 text-cdaccent shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Multi-year YTD</h3>
                        <p className="text-[11px] text-cdmuted">
                            Volume through {refLabel} each year (up to 5 years with data).
                        </p>
                    </div>
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

            <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                        <XAxis dataKey="year" tick={theme.axisTick} stroke={theme.axisStroke} />
                        <YAxis
                            tick={theme.axisTick}
                            stroke={theme.axisStroke}
                            width={48}
                            tickFormatter={(v) => formatMetricValue(metric, v)}
                        />
                        <Tooltip
                            content={(
                                <ChartTooltip
                                    formatter={(value, _name, item) => {
                                        const rides = item?.payload?.count;
                                        const ridesLabel = rides != null ? ` · ${rides} activities` : '';
                                        return `${formatMetricValue(metric, value)} ${activeMetric.unit}${ridesLabel}`;
                                    }}
                                />
                            )}
                        />
                        <Bar dataKey="value" fill={activeMetric.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MultiYearCompareChart;
