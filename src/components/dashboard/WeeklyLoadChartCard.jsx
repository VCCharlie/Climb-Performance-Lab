import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ChartTooltip } from '../ui';
import ChartHost from '../ui/ChartHost';
import { getChartTheme } from '../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import { buildWeeklyTssSeries } from '../../utils/weeklyLoadChart';
import {
    buildTrainingStatusOverview,
    computeWeeklyTssOptimalBand,
} from '../../utils/trainingStatusOverview';
import { formatNlNumber } from '../../utils/formatters';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';

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
    const description = `TSS per calendar week — dashed line is your weekly target${showBand ? '; shaded band is the optimal zone (85–115%)' : ''}.`;

    return (
        <CollapsibleDashboardCard
            title="Weekly load"
            icon={BarChart3}
            description={description}
            defaultExpanded
            bodyClassName="!pt-0"
        >
            {chartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-cdmuted text-sm">
                    No weekly TSS data yet
                </div>
            ) : (
                <ChartHost className="h-52 md:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
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
                </ChartHost>
            )}
        </CollapsibleDashboardCard>
    );
}
