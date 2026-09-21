import React, { useId, useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { cn } from '../../ui';
import { formatTotalMovingTime } from '../../../utils/activityLogFilterAnalytics';

function formatPct(value) {
    if (value == null || Number.isNaN(Number(value))) return null;
    return `${value}%`;
}

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
 */
export default function FilterAnalyticsBar({
    filterLabels = [],
    analytics,
    onResetFilters,
    className,
}) {
    const detailsId = useId();
    const [expanded, setExpanded] = useState(false);

    if (!analytics) return null;

    const countSub = analytics.rideCountPct != null
        ? `${analytics.rideCount} of ${analytics.totalRideCount} · ${formatPct(analytics.rideCountPct)} of log`
        : `${analytics.rideCount} activities`;

    const secondaryMetrics = [
        analytics.avgNormPower != null && {
            key: 'np',
            label: 'Avg NP',
            value: `${analytics.avgNormPower} W`,
        },
        analytics.avgIntensityFactor != null && {
            key: 'if',
            label: 'Avg IF',
            value: analytics.avgIntensityFactor.toFixed(2),
        },
        analytics.avgHeartRate != null && {
            key: 'hr',
            label: 'Avg HR',
            value: `${analytics.avgHeartRate} bpm`,
        },
        analytics.avgSpeedKmh != null && {
            key: 'spd',
            label: 'Avg speed',
            value: `${analytics.avgSpeedKmh} km/h`,
        },
        analytics.avgElevationM != null && analytics.avgElevationM > 0 && {
            key: 'elev-avg',
            label: 'Avg elev',
            value: `${analytics.avgElevationM} m`,
        },
    ].filter(Boolean);

    return (
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
                <div className="flex items-center gap-2 shrink-0">
                    {typeof onResetFilters === 'function' && (
                        <button
                            type="button"
                            onClick={onResetFilters}
                            className="text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded px-1"
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
                        Details
                        <ChevronDown
                            size={14}
                            className={cn('cd-transition', expanded && 'rotate-180')}
                            aria-hidden
                        />
                    </button>
                </div>
            </div>

            <div
                className="overflow-x-auto overscroll-x-contain px-3 py-2.5"
                role="region"
                aria-label="Aggregated filter metrics"
            >
                <div className="flex flex-nowrap sm:flex-wrap gap-2 min-w-min sm:min-w-0">
                    <MetricChip
                        label="Activities"
                        value={String(analytics.rideCount)}
                        sub={countSub}
                        accent
                    />
                    <MetricChip
                        label="Distance"
                        value={`${analytics.formatted.distanceKm} km`}
                        sub={formatPct(analytics.distancePctOfAll)
                            ? `${formatPct(analytics.distancePctOfAll)} of log`
                            : null}
                    />
                    <MetricChip
                        label="Moving time"
                        value={analytics.movingTimeLabel}
                        sub={formatPct(analytics.movingTimePctOfAll)
                            ? `${formatPct(analytics.movingTimePctOfAll)} of log`
                            : null}
                    />
                    <MetricChip
                        label="Elevation"
                        value={`${analytics.formatted.elevationM} m`}
                        sub={formatPct(analytics.elevationPctOfAll)
                            ? `${formatPct(analytics.elevationPctOfAll)} of log`
                            : null}
                    />
                    {analytics.totalLoad > 0 ? (
                        <MetricChip
                            label="Total TSS"
                            value={analytics.formatted.totalLoad}
                            sub={formatPct(analytics.loadPctOfAll)
                                ? `${formatPct(analytics.loadPctOfAll)} of log`
                                : null}
                        />
                    ) : null}
                    {secondaryMetrics.map((m) => (
                        <MetricChip
                            key={m.key}
                            label={m.label}
                            value={m.value}
                        />
                    ))}
                </div>
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
    );
}
