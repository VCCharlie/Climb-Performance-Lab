import React, { useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import ChartHost from '../../ui/ChartHost';
import ChartTooltip from '../../ui/ChartTooltip';
import { cn } from '../../ui';
import { CHART_A11Y_PROPS } from '../../../utils/chartA11y';
import { getChartTheme } from '../../../utils/chartTheme';
import { formatTotalMovingTime } from '../../../utils/activityLogFilterAnalytics';
import { buildFilterAnalyticsChartData } from '../../../utils/filterAnalyticsMetrics';

function InsightChartCard({ title, subtitle, children, className }) {
    return (
        <div className={cn('rounded-lg border border-cdborder/60 bg-cdsurface p-3', className)}>
            <div className="mb-2">
                <h3 className="text-xs font-bold text-cdtext">{title}</h3>
                {subtitle ? (
                    <p className="text-[10px] text-cdmuted mt-0.5">{subtitle}</p>
                ) : null}
            </div>
            {children}
        </div>
    );
}

/**
 * Side insight drawer (Concept A) — opened from the filter analytics bar.
 */
export default function FilterAnalyticsInsightDrawer({
    open,
    onClose,
    filterLabels = [],
    analytics,
}) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open || !analytics) return null;

    const theme = getChartTheme();
    const chartData = buildFilterAnalyticsChartData(analytics);
    const hasLoad = chartData.some((row) => row.load > 0);

    return (
        <div className="fixed inset-0 z-[85] flex justify-end" role="presentation">
            <button
                type="button"
                aria-label="Close insight drawer"
                className="absolute inset-0 bg-cdscrim/70 backdrop-blur-[1px]"
                onClick={onClose}
            />

            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Filter insight charts"
                className={cn(
                    'relative flex flex-col w-full max-w-md sm:max-w-lg h-full',
                    'bg-cdsurface border-l border-cdborder shadow-2xl',
                    'animate-in slide-in-from-right duration-200',
                    'max-sm:max-w-none max-sm:border-l-0 max-sm:border-t max-sm:mt-auto max-sm:h-[88vh] max-sm:rounded-t-xl max-sm:slide-in-from-bottom',
                )}
            >
                <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-cdborder/60 shrink-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-cdaccent">
                            <BarChart3 size={16} aria-hidden />
                            <h2 className="text-sm font-bold text-cdtext">Filter insights</h2>
                        </div>
                        <p className="text-[10px] text-cdmuted mt-1">
                            {analytics.rideCount} activities · {analytics.formatted.distanceKm} km · {analytics.movingTimeLabel}
                        </p>
                        {filterLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {filterLabels.map((label) => (
                                    <span
                                        key={label}
                                        className="text-[9px] px-1.5 py-0.5 rounded-full border border-cdborder bg-cdsurfacelow text-cdtext"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 rounded p-1.5 text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow cd-focus-ring"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    <InsightChartCard
                        title="Activities per year"
                        subtitle="Ride count in the filtered subset"
                    >
                        <ChartHost className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                    <XAxis dataKey="year" tick={theme.axisTick} stroke={theme.axisStroke} />
                                    <YAxis allowDecimals={false} tick={theme.axisTick} stroke={theme.axisStroke} width={32} />
                                    <Tooltip
                                        cursor={theme.cursor}
                                        content={(props) => (
                                            <ChartTooltip
                                                {...props}
                                                formatter={(value) => [value, 'Rides']}
                                            />
                                        )}
                                    />
                                    <Bar dataKey="rides" name="Rides" fill={theme.primary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartHost>
                    </InsightChartCard>

                    <InsightChartCard
                        title="Distance per year"
                        subtitle="Total km in the filtered subset"
                    >
                        <ChartHost className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                    <XAxis dataKey="year" tick={theme.axisTick} stroke={theme.axisStroke} />
                                    <YAxis tick={theme.axisTick} stroke={theme.axisStroke} width={36} />
                                    <Tooltip
                                        cursor={theme.cursor}
                                        content={(props) => (
                                            <ChartTooltip
                                                {...props}
                                                formatter={(value) => [`${value} km`, 'Distance']}
                                            />
                                        )}
                                    />
                                    <Bar dataKey="distanceKm" name="Distance" fill={theme.blue} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartHost>
                    </InsightChartCard>

                    {hasLoad ? (
                        <InsightChartCard
                            title="Training load per year"
                            subtitle="Total TSS in the filtered subset"
                        >
                            <ChartHost className="h-44 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                        <XAxis dataKey="year" tick={theme.axisTick} stroke={theme.axisStroke} />
                                        <YAxis tick={theme.axisTick} stroke={theme.axisStroke} width={36} />
                                        <Tooltip
                                            cursor={theme.cursor}
                                            content={(props) => (
                                                <ChartTooltip
                                                    {...props}
                                                    formatter={(value) => [value, 'TSS']}
                                                />
                                            )}
                                        />
                                        <Bar dataKey="load" name="TSS" fill={theme.green} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartHost>
                        </InsightChartCard>
                    ) : null}

                    {analytics.byYear?.length > 0 ? (
                        <InsightChartCard title="Year breakdown" subtitle="Table view of filtered volume">
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="text-left text-cdmuted border-b border-cdborder/40">
                                            <th scope="col" className="py-1 pr-3 font-semibold">Year</th>
                                            <th scope="col" className="py-1 pr-3 font-semibold tabular-nums">Rides</th>
                                            <th scope="col" className="py-1 pr-3 font-semibold tabular-nums">Distance</th>
                                            <th scope="col" className="py-1 pr-3 font-semibold tabular-nums">Time</th>
                                            <th scope="col" className="py-1 font-semibold tabular-nums">Elev</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.byYear.map((row) => (
                                            <tr key={row.year} className="border-b border-cdborder/20 last:border-0 text-cdtext">
                                                <th scope="row" className="py-1.5 pr-3 font-bold">{row.year}</th>
                                                <td className="py-1.5 pr-3 tabular-nums">{row.rideCount}</td>
                                                <td className="py-1.5 pr-3 tabular-nums">{row.distanceKm} km</td>
                                                <td className="py-1.5 pr-3 tabular-nums">
                                                    {formatTotalMovingTime(row.movingTimeSec)}
                                                </td>
                                                <td className="py-1.5 tabular-nums">{row.elevationM} m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </InsightChartCard>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}
