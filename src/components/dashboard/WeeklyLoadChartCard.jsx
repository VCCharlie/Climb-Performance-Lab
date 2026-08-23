import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClass } from '../../utils/chartTheme';
import { buildWeeklyTssSeries } from '../../utils/weeklyLoadChart';
import {
    buildTrainingStatusOverview,
    computeWeeklyTssOptimalBand,
} from '../../utils/trainingStatusOverview';
import { formatNlNumber } from '../../utils/formatters';

/**
 * Weekly TSS bars with target line and optimal load band (85–115% of target).
 */
export default function WeeklyLoadChartCard({ activities, userSettings }) {
    const status = useMemo(
        () => buildTrainingStatusOverview({ activities, userSettings }),
        [activities, userSettings],
    );

    const chartData = useMemo(
        () => buildWeeklyTssSeries(activities, 12),
        [activities],
    );

    const targetTss = status?.targetTss || 0;
    const optimalBand = useMemo(
        () => computeWeeklyTssOptimalBand(targetTss),
        [targetTss],
    );

    const theme = getChartTheme();
    const showBand = optimalBand.min > 0 && optimalBand.max > optimalBand.min;

    return (
        <div className={chartCardClass}>
            <div className="flex items-start gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-cdblue shrink-0 mt-0.5" aria-hidden />
                <div>
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">Weekly load</h3>
                    <p className="text-[11px] text-cdmuted">
                        TSS per calendar week — dashed line is your weekly target
                        {showBand ? '; shaded band is the optimal zone (85–115%)' : ''}
                    </p>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-cdmuted text-sm">
                    No weekly TSS data yet
                </div>
            ) : (
                <div className="h-52 md:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            {showBand ? (
                                <ReferenceArea
                                    y1={optimalBand.min}
                                    y2={optimalBand.max}
                                    fill="rgb(var(--cd-primary-rgb) / 0.12)"
                                    strokeOpacity={0}
                                    ifOverflow="extendDomain"
                                />
                            ) : null}
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                            <XAxis
                                dataKey="key"
                                stroke={theme.axis}
                                tick={theme.axisTick}
                                interval="preserveStartEnd"
                                minTickGap={28}
                                tickFormatter={(key) => {
                                    const row = chartData.find((r) => r.key === key);
                                    return row?.label?.split(' – ')[0]?.slice(0, 5) || key;
                                }}
                            />
                            <YAxis stroke={theme.axis} tick={theme.axisTick} width={36} />
                            <Tooltip
                                content={(props) => (
                                    <ChartTooltip
                                        {...props}
                                        label={props.payload?.[0]?.payload?.label ?? props.label}
                                        formatter={(val) => [`${formatNlNumber(val)} TSS`, 'Weekly load']}
                                    />
                                )}
                                cursor={theme.cursor}
                            />
                            {targetTss > 0 ? (
                                <ReferenceLine
                                    y={targetTss}
                                    stroke={theme.axis}
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.65}
                                    ifOverflow="extendDomain"
                                />
                            ) : null}
                            <Bar
                                dataKey="tss"
                                name="TSS"
                                fill="rgba(249,115,22,0.75)"
                                radius={[3, 3, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
