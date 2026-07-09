import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatDateDDMMYYYY } from '../../utils';
import { ChartTooltip } from '../ui';
import { getChartTheme, chartCardClassLg } from '../../utils/chartTheme';
import { calculateFitnessMetrics } from '../../utils/formTabMetrics';

/**
 * FormTab: Shows CTL, ATL and TSB (fitness / fatigue / form) progression over time.
 */

const StatBadge = ({ label, value, color }) => (
    <div className="bg-cdsurface border border-cdborder rounded-lg p-4 text-center">
        <div className="text-xs uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>{value ?? '—'}</div>
    </div>
);

const FormTab = ({
    data,
    customTicks,
}) => {
    const fitnessData = useMemo(() => calculateFitnessMetrics(data), [data]);

    const axisTicks = useMemo(() => {
        if (!customTicks) return undefined;
        return customTicks.map((t) => {
            const formatted = formatDateDDMMYYYY(t);
            if (formatted === '-') return new Date(t).getTime();
            const [dd, mm, yyyy] = formatted.split('-').map(Number);
            return new Date(yyyy, mm - 1, dd).getTime();
        });
    }, [customTicks]);

    const latest = fitnessData.length ? fitnessData[fitnessData.length - 1] : null;

    const tsbColor = latest && latest.tsb >= 5
        ? 'text-green-400'
        : latest && latest.tsb >= -10
            ? 'text-yellow-400'
            : 'text-red-400';

    const theme = getChartTheme();

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {latest ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <StatBadge label="CTL (Fitness)" value={latest.ctl} color="text-blue-400" />
                        <StatBadge label="ATL (Fatigue)" value={latest.atl} color="text-orange-400" />
                        <StatBadge label="TSB (Form)" value={latest.tsb} color={tsbColor} />
                    </div>

                    <div className={chartCardClassLg}>
                        <h3 className="text-lg font-bold text-cdtext mb-4">CTL / ATL / TSB</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={fitnessData}
                                    margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                                    <XAxis
                                        dataKey="dateNum"
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        scale="time"
                                        ticks={axisTicks}
                                        interval={0}
                                        minTickGap={50}
                                        stroke={theme.axis}
                                        tick={{ fill: theme.axis, fontSize: 11 }}
                                        tickFormatter={(ts) => formatDateDDMMYYYY(new Date(ts))}
                                    />
                                    <YAxis stroke={theme.axis} tick={{ fill: theme.axis, fontSize: 11 }} />
                                    <Tooltip
                                        content={(props) => (
                                            <ChartTooltip
                                                {...props}
                                                labelFormatter={(ts) => formatDateDDMMYYYY(ts)}
                                            />
                                        )}
                                        cursor={theme.cursor}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                                    <ReferenceLine y={0} stroke={theme.grid} />
                                    <Line type="monotone" dataKey="ctl" name="CTL" stroke={theme.blue} strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="atl" name="ATL" stroke={theme.primary} strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="tsb" name="TSB" stroke={theme.green} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-cdmuted mt-3">
                            CTL (42-day) = fitness · ATL (7-day) = fatigue · TSB = CTL − ATL (form)
                        </p>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-24 text-cdmuted text-sm border border-dashed border-cdborder rounded-xl">
                    No TSS in this period — CTL / ATL / TSB cannot be computed.
                </div>
            )}

            {!data?.length && (
                <div className="flex items-center justify-center h-40 text-cdmuted">
                    No activities available.
                </div>
            )}
        </div>
    );
};

export default FormTab;
