import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartTooltip, SegmentedControl } from '../../ui';
import { getChartTheme, chartCardClass } from '../../../utils/chartTheme';
import { seriesFromBarChartIndex } from '../../../utils/dashboardBarChartBuckets';
import { barChartGoalLineValue } from '../../../utils/volumeGoals';
import { formatNlNumber } from '../../../utils/formatters';

/**
 * BarChartCard — Reusable bar chart for a single metric (distance, tss or elevation).
 * Each card has its own independent Week / Month toggle.
 *
 * @param {ReturnType<import('../../../utils/dashboardBarChartBuckets').buildOverviewBarChartIndex>} barChartIndex
 * @param {'distance'|'tss'|'elevation'|'moving_time'} metric
 * @param {string}   title    - Card header label
 * @param {string}   unit     - Unit suffix shown in tooltip & axis
 * @param {string}   color    - Hex / CSS color for the bars
 */
const BarChartCard = ({ barChartIndex, metric, title, unit, color, userSettings }) => {
    const [groupBy, setGroupBy] = useState('week');
    const [rideType, setRideType] = useState('all');

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
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">{title}</h3>
                <div className="flex flex-col items-end gap-2">
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
            </div>

            {chartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-cdmuted text-sm">
                    No data in this period
                </div>
            ) : (
                <div className="h-44">
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
                                        formatter={(val) => [`${formatNlNumber(val)} ${isTime ? 'h' : unit}`, title]}
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
                            <Bar dataKey="value" name={title} fill={color} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default BarChartCard;
