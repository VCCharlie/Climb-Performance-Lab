import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import PowerCurveChart from './charts/PowerCurveChart';
import { ChartTooltip } from '../ui';
import { getChartTheme } from '../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import useMediaQuery from '../../hooks/useMediaQuery';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';

const DURATION_LABELS = { a_5min: '5 min', b_20min: '20 min', c_60min: '60 min' };

/**
 * Monthly best-efforts chart and MMP curve — only rendered when period stats exist.
 */
const PowerTabDetails = ({ monthlyBests, data, manualFtp }) => {
    const theme = getChartTheme();
    const isMobile = useMediaQuery('(max-width: 639px)');

    return (
        <>
            <CollapsibleDashboardCard
                title="Best monthly efforts (W)"
                icon={BarChart3}
                description="Peak 5 min, 20 min, and 60 min power per calendar month in the selected period."
                defaultExpanded
            >
                <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                        <LineChart
                            data={monthlyBests}
                            margin={{ top: 5, right: isMobile ? 8 : 20, left: isMobile ? -8 : 0, bottom: 0 }}
                            {...CHART_A11Y_PROPS}
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
            </CollapsibleDashboardCard>

            <PowerCurveChart data={data} manualFtp={manualFtp} />
        </>
    );
};

export default PowerTabDetails;
