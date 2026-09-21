import React, { useId, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, PanelRightOpen } from 'lucide-react';
import { cn } from '../../ui';
import { formatTotalMovingTime } from '../../../utils/activityLogFilterAnalytics';
import { buildFilterAnalyticsMetricChips } from '../../../utils/filterAnalyticsMetrics';
import { useFilterAnalyticsMetrics } from '../../../hooks/useFilterAnalyticsMetrics';
import FilterAnalyticsMetricPicker from './FilterAnalyticsMetricPicker';
import FilterAnalyticsInsightDrawer from './FilterAnalyticsInsightDrawer';

function MetricChip({ label, value, sub, accent = false, className }) {
    return (
        <div
            className={cn(
                'flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5 min-w-[4.5rem] shrink-0',
                accent
                    ? 'border-cdaccent/35 bg-cdaccent/10'
                    : 'border-cdborder/70 bg-cdsurface/80',
                className,
            )}
        >
            <span className="text-[9px] font-semibold uppercase tracking-wide text-cdmuted leading-none">
                {label}
            </span>
            <span className="text-sm font-bold tabular-nums text-cdtext leading-tight">
                {value}
            </span>
            {sub ? (
                <span className="text-[9px] tabular-nums text-cdmuted leading-none">
                    {sub}
                </span>
            ) : null}
        </div>
    );
}

/**
 * Compact filter summary + aggregated cycling metrics for the Activity Log.
 * Opens an insight drawer (Concept A) for charts and year trends.
 */
export default function FilterAnalyticsBar({
    filterLabels = [],
    filterState = null,
    analytics,
    onResetFilters,
    className,
}) {
    const detailsId = useId();
    const [expanded, setExpanded] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const metricPrefs = useFilterAnalyticsMetrics(filterState);

    const metricChips = useMemo(
        () => buildFilterAnalyticsMetricChips(metricPrefs.visibleKeys, analytics),
        [metricPrefs.visibleKeys, analytics],
    );

    if (!analytics) return null;

    return (
        <>
            <section
                aria-label="Filter summary and analytics"
                className={cn(
                    'shrink-0 rounded-lg border border-cdborder/70 bg-cdsurfacelow/40 overflow-hidden',
                    className,
                )}
            >
                <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 border-b border-cdborder/50">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-cdaccent shrink-0">
                            <BarChart3 size={14} aria-hidden />
                            Filter insights
                        </span>
                        {filterLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 min-w-0">
                                {filterLabels.map((label) => (
                                    <span
                                        key={label}
                                        className="text-[9px] px-1.5 py-0.5 rounded-full border border-cdborder bg-cdsurface text-cdtext truncate max-w-[10rem]"
                                        title={label}
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[10px] text-cdmuted">Filtered subset of your log</span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <FilterAnalyticsMetricPicker
                            visibleKeys={metricPrefs.visibleKeys}
                            activePreset={metricPrefs.activePreset}
                            presetLabel={metricPrefs.presetLabel}
                            applyPreset={metricPrefs.applyPreset}
                            toggleMetric={metricPrefs.toggleMetric}
                            isMetricVisible={metricPrefs.isMetricVisible}
                            contextProfile={metricPrefs.contextProfile}
                            usingContextSuggestion={metricPrefs.usingContextSuggestion}
                            manualOverride={metricPrefs.manualOverride}
                            onApplyContextSuggestion={metricPrefs.applyContextSuggestion}
                        />
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded px-1.5 py-0.5"
                        >
                            <PanelRightOpen size={13} aria-hidden />
                            Charts
                        </button>
                        {typeof onResetFilters === 'function' && (
                            <button
                                type="button"
                                onClick={onResetFilters}
                                className="text-[10px] font-semibold text-cdmuted hover:text-cdaccent hover:underline cd-focus-ring rounded px-1"
                            >
                                Clear filters
                            </button>
                        )}
                        <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={detailsId}
                            onClick={() => setExpanded((v) => !v)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-cdmuted hover:text-cdtext cd-focus-ring rounded px-1.5 py-0.5"
                        >
                            Table
                            <ChevronDown
                                size={14}
                                className={cn('cd-transition', expanded && 'rotate-180')}
                                aria-hidden
                            />
                        </button>
                    </div>
                </div>

                {metricPrefs.usingContextSuggestion && metricPrefs.contextProfile ? (
                    <div className="px-3 py-1.5 border-b border-cdborder/40 bg-cdaccent/5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] text-cdtext">
                            Suggested metrics for{' '}
                            <strong className="text-cdaccent">{metricPrefs.contextProfile.label}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={metricPrefs.dismissContextSuggestion}
                            className="text-[10px] font-semibold text-cdmuted hover:text-cdtext cd-focus-ring rounded px-1"
                        >
                            Use my saved metrics
                        </button>
                    </div>
                ) : null}

                {metricPrefs.manualOverride && metricPrefs.contextProfile ? (
                    <div className="px-3 py-1.5 border-b border-cdborder/40 bg-cdsurface/50 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] text-cdmuted">
                            Using your custom metrics
                        </p>
                        <button
                            type="button"
                            onClick={metricPrefs.applyContextSuggestion}
                            className="text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded px-1"
                        >
                            Apply {metricPrefs.contextProfile.label} suggestion
                        </button>
                    </div>
                ) : null}

                <div
                    className="overflow-x-auto overscroll-x-contain px-3 py-2.5"
                    role="region"
                    aria-label="Aggregated filter metrics"
                >
                    {metricChips.length > 0 ? (
                        <div className="flex flex-nowrap sm:flex-wrap gap-2 min-w-min sm:min-w-0">
                            {metricChips.map((chip) => (
                                <MetricChip
                                    key={chip.key}
                                    label={chip.label}
                                    value={chip.value}
                                    sub={chip.sub}
                                    accent={chip.accent}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-cdmuted">
                            No metrics with data for this filter. Choose other metrics via the picker.
                        </p>
                    )}
                </div>

                {expanded && analytics.byYear?.length > 0 ? (
                    <div
                        id={detailsId}
                        className="border-t border-cdborder/50 px-3 py-2.5 bg-cdsurface/40"
                    >
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-cdmuted mb-2">
                            Volume by year
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[20rem] text-[11px]">
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
                                        <tr
                                            key={row.year}
                                            className="border-b border-cdborder/20 last:border-0 text-cdtext"
                                        >
                                            <th scope="row" className="py-1.5 pr-3 font-bold text-cdtext">
                                                {row.year}
                                            </th>
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
                    </div>
                ) : null}
            </section>

            <FilterAnalyticsInsightDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filterLabels={filterLabels}
                analytics={analytics}
            />
        </>
    );
}
