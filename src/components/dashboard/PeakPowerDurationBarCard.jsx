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
import { getChartTheme } from '../../utils/chartTheme';
import {
    buildAnchorsCache,
    topNInterpolatedAtSec,
} from '../../utils/powerDurationTable';
import { formatDateDDMMYYYY } from '../../utils';
import CollapsibleDashboardCard from './CollapsibleDashboardCard';

const DURATION_OPTIONS = [
    { value: '5', label: '5s' },
    { value: '10', label: '10s' },
    { value: '20', label: '20s' },
    { value: '60', label: '1m' },
    { value: '300', label: '5m' },
    { value: '1200', label: '20m' },
    { value: '3600', label: '60m' },
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
    manualFtp,
    onOpenActivityInLog,
}) {
    const [durationSec, setDurationSec] = useState('300');

    const durationSecNum = Number(durationSec) || 300;

    const anchorsCache = useMemo(
        () => buildAnchorsCache(chartData, manualFtp),
        [chartData, manualFtp],
    );

    const rows = useMemo(() => {
        const top = topNInterpolatedAtSec(
            chartData,
            manualFtp,
            durationSecNum,
            10,
            {},
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
    }, [chartData, manualFtp, durationSecNum, anchorsCache]);

    const theme = getChartTheme();
    const durationLabel = DURATION_OPTIONS.find((o) => o.value === durationSec)?.label || `${durationSecNum}s`;

    if (!chartData?.length) return null;

    return (
        <CollapsibleDashboardCard
            title="Peak power leaderboard"
            icon={Zap}
            description="Top 10 interpolated efforts at each duration — switch duration to compare sprints vs endurance."
            defaultExpanded
        >
            <div className="flex justify-end mb-3">
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

            {rows.length === 0 ? (
                <p className="text-sm text-cdmuted text-center py-8">
                    No rides long enough for {durationLabel} peaks in your history.
                </p>
            ) : (
                <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={rows}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
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
                </div>
            )}
        </CollapsibleDashboardCard>
    );
}
