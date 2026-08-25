import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { LineChart } from 'lucide-react';
import { ChartTooltip } from '../../ui';
import { getChartTheme } from '../../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../../utils/chartA11y';
import CollapsibleDashboardCard from '../CollapsibleDashboardCard';

/**
 * PowerCurveChart — Mean Maximal Power (MMP) curve.
 *
 * Derives the all-time peak power for each effort duration (1m, 5m, 10m, 20m, 60m)
 * from the best-effort fields stored per activity.
 *
 * @param {object[]} data - Normalized activity array (from Dashboard filtered period)
 */

const DURATIONS = [
    { key: 'best_1min',  label: '1m',  secs: 60 },
    { key: 'best_5min',  label: '5m',  secs: 300 },
    { key: 'best_10min', label: '10m', secs: 600 },
    { key: 'best_20min', label: '20m', secs: 1200 },
    { key: 'best_60min', label: '60m', secs: 3600 },
];

const FTP_CAPS = {
    best_1min:  4.0,
    best_5min:  2.2,
    best_10min: 1.6,
    best_20min: 1.3,
    best_60min: 1.1,
};

const PowerCurveChart = ({ data, manualFtp }) => {
    const curveData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return DURATIONS.map(({ key, label }) => {
            const cap = manualFtp > 0 ? manualFtp * FTP_CAPS[key] : 1500;

            const peak = data.reduce((max, a) => {
                const v = Number(a[key]) || 0;
                return (v <= cap && v > max) ? v : max;
            }, 0);

            return { label, watts: peak > 0 ? peak : null };
        }).filter((p) => p.watts !== null);
    }, [data, manualFtp]);

    const theme = getChartTheme();
    const best20m = curveData.find((p) => p.label === '20m')?.watts;
    const eFTP = best20m ? Math.round(best20m * 0.95) : null;

    const description = eFTP
        ? `Mean maximal power from best efforts in the selected period. eFTP reference: ${eFTP} W.`
        : 'Mean maximal power from best efforts in the selected period.';

    return (
        <CollapsibleDashboardCard
            title="Power Curve (MMP)"
            icon={LineChart}
            description={description}
            defaultExpanded={false}
        >
            {curveData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-cdmuted text-sm">
                    No best-effort data available in this period.
                </div>
            ) : (
                <>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={curveData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                                <defs>
                                    <linearGradient id="mmpGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                                <XAxis dataKey="label" stroke={theme.axis} tick={theme.axisTick} />
                                <YAxis
                                    stroke={theme.axis}
                                    tick={theme.axisTick}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(v) => `${v}W`}
                                />
                                <Tooltip
                                    content={(props) => (
                                        <ChartTooltip
                                            {...props}
                                            hideLabel
                                            formatter={(v) => [`${v} W`, 'MMP']}
                                        />
                                    )}
                                    cursor={theme.cursor}
                                />
                                {eFTP && (
                                    <ReferenceLine
                                        y={eFTP}
                                        stroke={theme.green}
                                        strokeDasharray="6 3"
                                        label={{ value: `eFTP ${eFTP}W`, fill: theme.green, fontSize: 10, dy: -6 }}
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="watts"
                                    name="MMP"
                                    stroke={theme.primary}
                                    strokeWidth={2.5}
                                    fill="url(#mmpGradient)"
                                    dot={{ r: 5, fill: theme.primary, strokeWidth: 0 }}
                                    activeDot={{ r: 7 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-cdmuted mt-2">
                        Based on best effort per activity in the selected period.
                    </p>
                </>
            )}
        </CollapsibleDashboardCard>
    );
};

export default PowerCurveChart;
