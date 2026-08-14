import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Activity } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { ChartTooltip, cn } from '../ui';
import { getChartTheme, chartCardShellClass } from '../../utils/chartTheme';
import CollapsibleSection from '../ui/CollapsibleSection';
import { buildFitnessForecast } from '../../utils/coach/coachFitnessForecast';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { addDaysToYmd } from '../../utils/dashboardVolumeTotals';
import useMediaQuery from '../../hooks/useMediaQuery';

const MOBILE_CHART_MARGINS = { top: 4, right: 6, left: 0, bottom: 0 };
const DESKTOP_CHART_MARGINS = { top: 5, right: 20, left: 0, bottom: 0 };

const StatBadge = ({ label, value, color }) => (
    <div className="bg-cdborder/20 border border-cdborder rounded-lg p-3 text-center">
        <div className="text-[10px] uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-xl font-black tabular-nums ${color}`}>{value ?? '—'}</div>
    </div>
);

const CoachFitnessForecast = ({
    activities,
    userSettings,
    week1Sessions,
    week2Sessions = [],
    horizonSessions = null,
}) => {
    const referenceYmd = todayYmd();
    const weeklyHours = Number(userSettings?.weeklyHoursTarget) || 5;
    const isMobile = useMediaQuery('(max-width: 767px)');
    const chartMargins = isMobile ? MOBILE_CHART_MARGINS : DESKTOP_CHART_MARGINS;

    const plannedSessionCount = horizonSessions?.length
        ? horizonSessions.length
        : week2Sessions.length;

    const { chartData, summary } = useMemo(
        () => buildFitnessForecast({
            activities,
            week1Sessions,
            week2Sessions,
            horizonSessions,
            weeklyHours,
            referenceYmd,
            historyDays: 28,
            forecastDays: plannedSessionCount > 7 ? 21 : plannedSessionCount > 0 ? 14 : 7,
        }),
        [activities, week1Sessions, week2Sessions, horizonSessions, weeklyHours, referenceYmd, plannedSessionCount],
    );

    const projectionStart = addDaysToYmd(referenceYmd, 1);
    const actualData = chartData.filter((r) => !r.projected);
    const projectedData = chartData.filter((r) => r.projected);
    const bridgePoint = chartData.find((r) => r.date === referenceYmd);
    const projectedLineData = bridgePoint
        ? [bridgePoint, ...projectedData]
        : projectedData;

    const theme = getChartTheme();
    const tsbColor = summary.currentTsb >= 5
        ? 'text-green-400'
        : summary.currentTsb >= -10
            ? 'text-yellow-400'
            : 'text-red-400';
    const endTsbColor = summary.projectedEndTsb >= 5
        ? 'text-green-400'
        : summary.projectedEndTsb >= -10
            ? 'text-yellow-400'
            : 'text-red-400';

    if (!chartData.length) return null;

    return (
        <CollapsibleSection
            title="Fitness forecast (CTL / ATL / TSB)"
            subtitle="Solid lines = actual from your log. Dashed = projected if you follow the fluid week plan (estimated TSS per session)."
            icon={Activity}
            iconClassName="text-blue-400"
            defaultExpanded
        >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBadge label="TSB now" value={summary.currentTsb} color={tsbColor} />
                <StatBadge label="TSB projected" value={summary.projectedEndTsb} color={endTsbColor} />
                <StatBadge label="CTL projected" value={summary.projectedEndCtl} color="text-blue-400" />
                <StatBadge label="Planned sessions" value={summary.plannedSessions} color="text-cdtext" />
            </div>

            <div
                className={cn(
                    chartCardShellClass,
                    isMobile
                        ? 'py-2 pl-0 pr-1 -mx-4 rounded-none border-x-0'
                        : 'p-5 md:p-6',
                )}
            >
                <div className={cn('w-full', isMobile ? 'h-[min(52vw,280px)]' : 'h-72')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={chartMargins}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                            {projectionStart && (
                                <ReferenceArea
                                    x1={new Date(`${projectionStart}T12:00:00`).getTime()}
                                    x2={chartData[chartData.length - 1]?.dateNum}
                                    fill={theme.primary}
                                    fillOpacity={0.06}
                                />
                            )}
                            <XAxis
                                dataKey="dateNum"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                scale="time"
                                stroke={theme.axis}
                                tick={{ fill: theme.axis, fontSize: isMobile ? 10 : 10 }}
                                tickFormatter={(ts) => formatDateDDMMYYYY(new Date(ts))}
                                tickMargin={isMobile ? 4 : 8}
                                minTickGap={isMobile ? 28 : 40}
                            />
                            <YAxis
                                stroke={theme.axis}
                                tick={{ fill: theme.axis, fontSize: isMobile ? 9 : 11 }}
                                width={isMobile ? 26 : 44}
                                tickCount={isMobile ? 5 : 6}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={(props) => (
                                    <ChartTooltip
                                        {...props}
                                        labelFormatter={(ts) => formatDateDDMMYYYY(ts)}
                                    />
                                )}
                                cursor={theme.cursor}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ paddingTop: isMobile ? '8px' : '12px', fontSize: isMobile ? '10px' : '12px' }}
                            />
                            <ReferenceLine y={0} stroke={theme.grid} />
                            <Line
                                type="monotone"
                                data={actualData}
                                dataKey="ctl"
                                name="CTL (actual)"
                                stroke={theme.blue}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                data={actualData}
                                dataKey="atl"
                                name="ATL (actual)"
                                stroke={theme.primary}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                data={actualData}
                                dataKey="tsb"
                                name="TSB (actual)"
                                stroke={theme.green}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                data={projectedLineData}
                                dataKey="ctl"
                                name="CTL (projected)"
                                stroke={theme.blue}
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={false}
                                connectNulls
                                legendType="none"
                            />
                            <Line
                                type="monotone"
                                data={projectedLineData}
                                dataKey="atl"
                                name="ATL (projected)"
                                stroke={theme.primary}
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={false}
                                connectNulls
                                legendType="none"
                            />
                            <Line
                                type="monotone"
                                data={projectedLineData}
                                dataKey="tsb"
                                name="TSB (projected)"
                                stroke={theme.green}
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={false}
                                connectNulls
                                legendType="none"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-cdmuted mt-3 leading-relaxed">
                    Shaded area = forecast window. Projections assume planned sessions are completed as prescribed
                    (estimated TSS). Logged rides override estimates for past and completed days.
                    {summary.minTsb != null && summary.maxTsb != null
                        ? ` Forecast TSB range: ${summary.minTsb} to ${summary.maxTsb}.`
                        : ''}
                </p>
            </div>
        </CollapsibleSection>
    );
};

export default CoachFitnessForecast;
