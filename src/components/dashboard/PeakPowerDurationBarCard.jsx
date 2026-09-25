import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Zap } from 'lucide-react';
import { ChartTooltip, SegmentedControl } from '../ui';
import ChartHost from '../ui/ChartHost';
import { getChartTheme } from '../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import {
    buildAnchorsCache,
    topNInterpolatedAtSec,
    dashboardFilterLabel,
} from '../../utils/powerDurationTable';
import {
    PEAK_LEADERBOARD_SCOPES,
    selectPeakLeaderboardActivities,
} from '../../utils/dashboardActivityPeaks';
import { formatDateDDMMYYYY } from '../../utils';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';
import { PEAK_BAR_POWER_DURATIONS, topTenInterpolatedOpts } from '../../utils/powerDurationStandard';

const DURATION_OPTIONS = PEAK_BAR_POWER_DURATIONS.map(({ sec, label }) => ({
    value: String(sec),
    label,
}));

const SCOPE_OPTIONS = [
    { value: PEAK_LEADERBOARD_SCOPES.PERIOD, label: 'Period bests' },
    { value: PEAK_LEADERBOARD_SCOPES.ALLTIME, label: 'All-time bests' },
];

const BAR_COLORS = [
    'rgba(249, 115, 22, 0.9)',
    'rgba(249, 115, 22, 0.82)',
    'rgba(249, 115, 22, 0.74)',
    'rgba(59, 130, 246, 0.85)',
    'rgba(59, 130, 246, 0.75)',
    'rgba(34, 197, 94, 0.85)',
    'rgba(34, 197, 94, 0.75)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(168, 85, 247, 0.7)',
    'rgba(168, 85, 247, 0.6)',
];

/**
 * Formbeat-style horizontal peak leaderboard — one duration at a time via toggles.
 */
export default function PeakPowerDurationBarCard({
    chartData,
    periodData,
    timeRange = '1Y',
    manualFtp,
    onOpenActivityInLog,
}) {
    const [durationSec, setDurationSec] = useState('300');
    const [scope, setScope] = useState(PEAK_LEADERBOARD_SCOPES.PERIOD);

    const durationSecNum = Number(durationSec) || 300;
    const periodLabel = dashboardFilterLabel(timeRange);

    const leaderboardActivities = useMemo(
        () => selectPeakLeaderboardActivities(scope, periodData, chartData),
        [scope, periodData, chartData],
    );

    const anchorsCache = useMemo(
        () => buildAnchorsCache(leaderboardActivities, manualFtp),
        [leaderboardActivities, manualFtp],
    );

    const rows = useMemo(() => {
        const durationDef = PEAK_BAR_POWER_DURATIONS.find((d) => d.sec === durationSecNum);
        const opts = durationDef ? topTenInterpolatedOpts(durationDef) : {};
        const top = topNInterpolatedAtSec(
            leaderboardActivities,
            manualFtp,
            durationSecNum,
            10,
            opts,
            anchorsCache,
        );
        return top.map((entry, index) => {
            const title = entry.activity?.title?.trim() || 'Ride';
            const short = title.length > 22 ? `${title.slice(0, 19)}…` : title;
            return {
                rank: index + 1,
                watts: entry.watts,
                label: `#${index + 1} ${short}`,
                dateLabel: entry.activity?.date
                    ? formatDateDDMMYYYY(entry.activity.date)
                    : '',
                activityId: entry.activity?.id,
            };
        });
    }, [leaderboardActivities, manualFtp, durationSecNum, anchorsCache]);

    const theme = getChartTheme();
    const durationLabel = DURATION_OPTIONS.find((o) => o.value === durationSec)?.label || `${durationSecNum}s`;
    const scopeHint = scope === PEAK_LEADERBOARD_SCOPES.PERIOD
        ? `Top efforts in ${periodLabel}`
        : 'Top efforts across your full history';

    if (!chartData?.length) return null;

    return (
        <CollapsibleDashboardCard
            title="Peak power leaderboard"
            icon={Zap}
            description="Top 10 interpolated efforts at each duration — switch duration to compare sprints vs endurance. Toggle period vs all-time bests."
            defaultExpanded
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <p className="text-xs text-cdmuted">{scopeHint}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
                    <SegmentedControl
                        size="sm"
                        caps={false}
                        dense
                        value={scope}
                        onChange={setScope}
                        aria-label="Peak power scope"
                        options={SCOPE_OPTIONS}
                    />
                    <SegmentedControl
                        size="sm"
                        caps={false}
                        dense
                        value={durationSec}
                        onChange={setDurationSec}
                        aria-label="Peak power duration"
                        options={DURATION_OPTIONS}
                    />
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-sm text-cdmuted text-center py-8">
                    {scope === PEAK_LEADERBOARD_SCOPES.PERIOD
                        ? `No rides in ${periodLabel} long enough for ${durationLabel} peaks.`
                        : `No rides long enough for ${durationLabel} peaks in your history.`}
                </p>
            ) : (
                <ChartHost className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={rows}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                            {...CHART_A11Y_PROPS}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} opacity={0.65} />
                            <XAxis
                                type="number"
                                stroke={theme.axis}
                                tick={theme.axisTick}
                                domain={[0, 'auto']}
                                unit=" W"
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                stroke={theme.axis}
                                tick={{ fill: theme.axis, fontSize: 10 }}
                                width={120}
                            />
                            <Tooltip
                                content={(props) => (
                                    <ChartTooltip
                                        {...props}
                                        label={props.payload?.[0]?.payload?.dateLabel ?? props.label}
                                        formatter={(val) => [`${val} W`, `${durationLabel} peak`]}
                                    />
                                )}
                                cursor={theme.cursor}
                            />
                            <Bar
                                dataKey="watts"
                                name="Peak power"
                                radius={[0, 4, 4, 0]}
                                maxBarSize={22}
                                onClick={(data) => {
                                    const id = data?.activityId;
                                    if (id != null && typeof onOpenActivityInLog === 'function') {
                                        onOpenActivityInLog(id);
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                {rows.map((_, i) => (
                                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartHost>
            )}
        </CollapsibleDashboardCard>
    );
}
