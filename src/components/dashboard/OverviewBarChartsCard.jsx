import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ChartTooltip, SegmentedControl } from '../ui';
import { getChartTheme, chartCardClass } from '../../utils/chartTheme';
import { seriesFromBarChartIndex } from '../../utils/dashboardBarChartBuckets';
import { barChartGoalLineValue } from '../../utils/volumeGoals';
import { formatNlNumber } from '../../utils/formatters';

const METRIC_OPTIONS = [
    { value: 'distance', label: 'Distance', unit: 'km', color: 'rgba(59,130,246,0.75)' },
    { value: 'moving_time', label: 'Time', unit: 'hour', color: 'rgba(168,85,247,0.75)' },
    { value: 'tss', label: 'TSS', unit: 'TSS', color: 'rgba(249,115,22,0.75)' },
    { value: 'elevation', label: 'Elevation', unit: 'm', color: 'rgba(34,197,94,0.75)' },
];

/**
 * Single overview card with metric switcher — replaces four separate BarChartCards.
 */
export default function OverviewBarChartsCard({ barChartIndex, userSettings }) {
    const [metric, setMetric] = useState('distance');
    const [groupBy, setGroupBy] = useState('week');
    const [rideType, setRideType] = useState('all');

    const activeMetric = METRIC_OPTIONS.find((m) => m.value === metric) || METRIC_OPTIONS[0];

    const chartData = useMemo(
        () => seriesFromBarChartIndex(barChartIndex, groupBy, rideType, metric),
        [barChartIndex, groupBy, rideType, metric],
    );

    const goalLineValue = useMemo(
        () => barChartGoalLineValue(metric, groupBy, userSettings),
        [metric, groupBy, userSettings],
    );

    const isTime = metric === 'moving_time';
    const theme = getChartTheme();

    return (
        <div className={chartCardClass}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
                <div className="flex items-start gap-2 min-w-0">
                    <BarChart3 className="w-5 h-5 text-cdblue shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Volume charts</h3>
                        <p className="text-[11px] text-cdmuted">Distance, time, TSS, and elevation in one view</p>
                    </div>
                </div>
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={metric}
                    onChange={setMetric}
                    aria-label="Volume chart metric"
                    options={METRIC_OPTIONS.map(({ value, label }) => ({ value, label }))}
                />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mb-4">
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={groupBy}
                    onChange={setGroupBy}
                    aria-label="Chart grouping"
                    options={[
                        { value: 'week', label: 'Week' },
                        { value: 'month', label: 'Month' },
                        { value: 'year', label: 'Year' },
                    ]}
                />
                <SegmentedControl
                    size="sm"
                    caps={false}
                    dense
                    value={rideType}
                    onChange={setRideType}
                    aria-label="Ride environment filter"
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'outdoor', label: 'Outdoor' },
                        { value: 'indoor', label: 'Indoor' },
                    ]}
                />
            </div>

            {chartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-cdmuted text-sm">
                    No data in this period
                </div>
            ) : (
                <div className="h-52 md:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                            <XAxis
                                dataKey="label"
                                stroke={theme.axis}
                                tick={theme.axisTick}
                                interval="preserveStartEnd"
                                minTickGap={groupBy === 'week' ? 40 : 20}
                            />
                            <YAxis stroke={theme.axis} tick={theme.axisTick} width={36} />
                            <Tooltip
                                content={(props) => (
                                    <ChartTooltip
                                        {...props}
                                        label={props.payload?.[0]?.payload?.periodLabel ?? props.label}
                                        formatter={(val) => [
                                            `${formatNlNumber(val)} ${isTime ? 'h' : activeMetric.unit}`,
                                            activeMetric.label,
                                        ]}
                                    />
                                )}
                                cursor={theme.cursor}
                            />
                            {goalLineValue > 0 ? (
                                <ReferenceLine
                                    y={goalLineValue}
                                    stroke={theme.axis}
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.55}
                                    ifOverflow="extendDomain"
                                />
                            ) : null}
                            <Bar
                                dataKey="value"
                                name={activeMetric.label}
                                fill={activeMetric.color}
                                radius={[3, 3, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
