import React, { useEffect, useMemo, useRef } from 'react';
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
import {
    buildFilterAnalyticsYearChartData,
    buildYearChartSeries,
} from '../../../utils/filterAnalyticsYearTable';
import FilterAnalyticsYearTable from './FilterAnalyticsYearTable';

function InsightChartCard({ title, subtitle, children, className }) {
    return (
        <div className={cn('rounded-lg border border-cdborder/60 bg-cdsurface p-3 shrink-0', className)}>
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

function YearMetricBarChart({ series, chartData, theme }) {
    const fill = theme[series.colorKey] || theme.primary;

    return (
        <ChartHost className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} {...CHART_A11Y_PROPS}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="year" tick={theme.axisTick} stroke={theme.axisStroke} />
                    <YAxis
                        allowDecimals={series.allowDecimals !== false}
                        tick={theme.axisTick}
                        stroke={theme.axisStroke}
                        width={36}
                    />
                    <Tooltip
                        cursor={theme.cursor}
                        content={(props) => (
                            <ChartTooltip
                                {...props}
                                formatter={(value) => series.formatTooltip(Number(value))}
                            />
                        )}
                    />
                    <Bar
                        dataKey={series.dataKey}
                        name={series.title}
                        fill={fill}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartHost>
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
    visibleColumnKeys = [],
}) {
    const drawerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const blockBackgroundScroll = (e) => {
            if (drawerRef.current?.contains(e.target)) return;
            e.preventDefault();
        };
        document.addEventListener('wheel', blockBackgroundScroll, { passive: false });
        document.addEventListener('touchmove', blockBackgroundScroll, { passive: false });

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('wheel', blockBackgroundScroll);
            document.removeEventListener('touchmove', blockBackgroundScroll);
        };
    }, [open, onClose]);

    const theme = getChartTheme();
    const chartData = useMemo(
        () => buildFilterAnalyticsYearChartData(analytics?.byYear || []),
        [analytics?.byYear],
    );
    const chartSeries = useMemo(
        () => buildYearChartSeries(visibleColumnKeys, analytics?.byYear || []),
        [visibleColumnKeys, analytics?.byYear],
    );

    if (!open || !analytics) return null;

    return (
        <div className="fixed inset-0 z-[85] flex justify-end overflow-hidden" role="presentation">
            <button
                type="button"
                aria-label="Close insight drawer"
                className="absolute inset-0 bg-cdscrim/70 backdrop-blur-[1px]"
                onClick={onClose}
            />

            <aside
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-label="Filter insight charts"
                className={cn(
                    'relative flex flex-col w-full max-w-md sm:max-w-lg',
                    'h-full max-h-full min-h-0 overflow-hidden',
                    'bg-cdsurface border-l border-cdborder shadow-2xl',
                    'animate-in slide-in-from-right duration-200',
                    'max-sm:max-w-none max-sm:border-l-0 max-sm:border-t max-sm:mt-auto max-sm:h-[88vh] max-sm:max-h-[88vh] max-sm:rounded-t-xl max-sm:slide-in-from-bottom',
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
                        <p className="text-[10px] text-cdmuted mt-1">
                            Charts and table follow your Year table column selection.
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

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3 custom-scrollbar touch-pan-y">
                    {chartSeries.length > 0 ? (
                        chartSeries.map((series) => (
                            <InsightChartCard
                                key={series.key}
                                title={series.title}
                                subtitle={series.subtitle}
                            >
                                <YearMetricBarChart
                                    series={series}
                                    chartData={chartData}
                                    theme={theme}
                                />
                            </InsightChartCard>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed border-cdborder px-3 py-4 text-[11px] text-cdmuted">
                            No charts for the selected columns. Choose metrics in the Volume by year column picker.
                        </div>
                    )}

                    {analytics.byYear?.length > 0 ? (
                        <InsightChartCard title="Year breakdown" subtitle="Same columns as your year table picker">
                            <FilterAnalyticsYearTable
                                rows={analytics.byYear}
                                visibleColumnKeys={visibleColumnKeys}
                                compact
                            />
                        </InsightChartCard>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}
