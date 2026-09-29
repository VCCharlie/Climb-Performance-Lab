import React, { useMemo, useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from 'recharts';
import { formatNlNumber } from '../../utils/formatters';
import { safeSessionStorageSet } from '../../utils/safeStorage.js';
import { ChartTooltip } from '../ui';
import ChartHost from '../ui/ChartHost';
import { getChartTheme, chartCardClass } from '../../utils/chartTheme';
import { CHART_A11Y_PROPS } from '../../utils/chartA11y';
import {
    formatDurationHoursMinutes,
    formatWeekChartTickEn,
    formatMonthChartTickEn,
    formatYearChartTickEn,
    orderVolumeRowsChronological,
    trailingMovingAverage,
    addDaysToYmd,
    monthKeyToDateRange,
    yearKeyToDateRange,
    buildWeeklyVolumeTotals,
    buildMonthlyVolumeTotals,
    buildYearlyVolumeTotals,
    mondayOneYearBefore,
    monthKeyOneYearBefore,
    yearKeyOneYearBefore,
} from '../../utils/dashboardVolumeTotals';

const VOL_CHART_STORAGE_KEY = 'cpl.dashboard.volumeChart.v1';

function readVolumeChartPersist() {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(VOL_CHART_STORAGE_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        return o && typeof o === 'object' ? o : null;
    } catch {
        return null;
    }
}

const STRAVA_ORANGE = '#f08a38';

const BAR_SERIES_NAME = 'This period';
const COMPARE_PREV = 'Previous period';
const COMPARE_YEAR = 'Same window, last year';
const trendSeriesName = (window) => `Trend (${window}-period avg)`;

const METRICS = [
    { id: 'distance', label: 'Distance', barValue: (r) => r.distanceKm },
    { id: 'time', label: 'Time', barValue: (r) => (Number(r.movingTimeSec) || 0) / 3600 },
    { id: 'elevation', label: 'Elev gain', barValue: (r) => r.elevationM },
    { id: 'load', label: 'Load (TSS)', barValue: (r) => r.load },
];

const pill = (active) =>
    `px-3 py-2 rounded-lg text-xs font-bold border transition-colors cd-focus-ring outline-none ${
        active
            ? 'bg-cdborder text-cdaccent border-cdaccent/60 shadow-sm'
            : 'bg-cdbg/50 text-cdmuted border-cdborder hover:text-cdtext hover:border-cdborder'
    }`;

/**
 * Strava-style bar chart: weekly or monthly buckets, metric toggles, summary for selected bar.
 */
const VolumeTotalsChart = ({
    weeklyRows,
    monthlyRows,
    yearlyRows,
    onOpenActivityLogDateRange,
    comparePrevPeriodActivities = [],
    comparePrevYearActivities = [],
}) => {
    const persisted = readVolumeChartPersist();
    const [cadence, setCadence] = useState(() =>
        (['weekly', 'monthly', 'yearly'].includes(persisted?.cadence) ? persisted.cadence : 'weekly'),
    );
    const [metricId, setMetricId] = useState(() =>
        (['distance', 'time', 'elevation', 'load'].includes(persisted?.metricId) ? persisted.metricId : 'distance'),
    );
    const [selectedKey, setSelectedKey] = useState(() =>
        (typeof persisted?.selectedKey === 'string' ? persisted.selectedKey : null),
    );

    const [compareMode, setCompareMode] = useState(() =>
        (['off', 'prevPeriod', 'prevYear'].includes(persisted?.compareMode) ? persisted.compareMode : 'off'),
    );

    useEffect(() => {
        if (typeof sessionStorage === 'undefined') return;
        safeSessionStorageSet(
            VOL_CHART_STORAGE_KEY,
            JSON.stringify({ cadence, metricId, selectedKey, compareMode }),
        );
    }, [cadence, metricId, selectedKey, compareMode]);

    const sourceRows = cadence === 'weekly'
        ? weeklyRows
        : cadence === 'monthly'
            ? monthlyRows
            : yearlyRows;
    const chronological = useMemo(() => orderVolumeRowsChronological(sourceRows), [sourceRows]);

    const chartData = useMemo(() => {
        const metric = METRICS.find((x) => x.id === metricId) || METRICS[0];
        const trendWindow = cadence === 'weekly' ? 4 : cadence === 'monthly' ? 3 : 3;

        const compareActs =
            compareMode === 'prevPeriod'
                ? comparePrevPeriodActivities
                : compareMode === 'prevYear'
                    ? comparePrevYearActivities
                    : null;

        const compareRowsOrdered =
            compareActs?.length > 0
                ? orderVolumeRowsChronological(
                    cadence === 'weekly'
                        ? buildWeeklyVolumeTotals(compareActs)
                        : cadence === 'monthly'
                            ? buildMonthlyVolumeTotals(compareActs)
                            : buildYearlyVolumeTotals(compareActs),
                )
                : [];

        const compareKeyToVal = new Map(
            compareRowsOrdered.map((r) => [r.key, Math.max(0, Number(metric.barValue(r)) || 0)]),
        );

        const rows = chronological.map((r) => ({
            ...r,
            barValue: Math.max(0, Number(metric.barValue(r)) || 0),
            tick: cadence === 'weekly'
                ? formatWeekChartTickEn(r.key)
                : cadence === 'monthly'
                    ? formatMonthChartTickEn(r.key)
                    : formatYearChartTickEn(r.key),
        }));

        const nAlign = Math.min(rows.length, compareRowsOrdered.length);
        const offAlign = rows.length - nAlign;

        const withCompare = rows.map((row, i) => {
            let compareBar = 0;
            if (compareMode === 'prevYear') {
                const look = cadence === 'weekly'
                    ? mondayOneYearBefore(row.key)
                    : cadence === 'monthly'
                        ? monthKeyOneYearBefore(row.key)
                        : yearKeyOneYearBefore(row.key);
                compareBar = look && compareKeyToVal.has(look) ? compareKeyToVal.get(look) : 0;
            } else if (compareMode === 'prevPeriod' && nAlign > 0 && i >= offAlign) {
                const pr = compareRowsOrdered[i - offAlign];
                compareBar = pr ? Math.max(0, Number(metric.barValue(pr)) || 0) : 0;
            }
            return { ...row, compareBar };
        });

        const vals = withCompare.map((r) => r.barValue);
        const trend = trailingMovingAverage(vals, trendWindow);
        return withCompare.map((r, i) => ({
            ...r,
            trendValue: trend[i],
            trendWindow,
        }));
    }, [
        chronological,
        metricId,
        cadence,
        compareMode,
        comparePrevPeriodActivities,
        comparePrevYearActivities,
    ]);

    const selectedIndex = useMemo(() => {
        if (!chartData.length) return -1;
        if (selectedKey) {
            const i = chartData.findIndex((r) => r.key === selectedKey);
            if (i >= 0) return i;
        }
        return chartData.length - 1;
    }, [chartData, selectedKey]);

    const selected = selectedIndex >= 0 ? chartData[selectedIndex] : null;

    const selectionDateRange = useMemo(() => {
        if (!selected) return null;
        if (cadence === 'weekly') {
            const endYmd = addDaysToYmd(selected.key, 6);
            if (!endYmd) return null;
            return { startYmd: selected.key, endYmd };
        }
        if (cadence === 'monthly') {
            return monthKeyToDateRange(selected.key);
        }
        return yearKeyToDateRange(selected.key);
    }, [selected, cadence]);

    const yTickFormatter = (v) => {
        if (metricId === 'time') return `${Math.round(v * 10) / 10}h`;
        if (metricId === 'distance') return formatNlNumber(Math.round(v * 10) / 10);
        return formatNlNumber(Math.round(v));
    };

    const formatTooltipMetricValue = (value) => {
        const v = Number(value) || 0;
        if (metricId === 'time') return `${Math.round(v * 10) / 10} h`;
        if (metricId === 'distance') return `${Math.round(v * 10) / 10} km`;
        if (metricId === 'elevation') return `${Math.round(v)} m`;
        return `${Math.round(v)}`;
    };

    const theme = getChartTheme();

    const xInterval = chartData.length > 18 ? Math.max(0, Math.floor(chartData.length / 14)) : 0;

    if (!chartData.length) {
        return (
            <div className="rounded-xl border border-cdborder bg-cdsurface p-6 text-center text-cdmuted text-sm">
                Not enough data to plot this view.
            </div>
        );
    }

    return (
        <div className={`${chartCardClass} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-bold text-cdtext">Volume chart</h3>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Week, month, or year">
                    <button type="button" className={pill(cadence === 'weekly')} onClick={() => setCadence('weekly')}>
                        Weekly
                    </button>
                    <button type="button" className={pill(cadence === 'monthly')} onClick={() => setCadence('monthly')}>
                        Monthly
                    </button>
                    <button type="button" className={pill(cadence === 'yearly')} onClick={() => setCadence('yearly')}>
                        Yearly
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-start" role="group" aria-label="Metric">
                {METRICS.map((m) => (
                    <button key={m.id} type="button" className={pill(metricId === m.id)} onClick={() => setMetricId(m.id)}>
                        {m.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 justify-start items-center" role="group" aria-label="Compare">
                <span className="text-[10px] text-cdmuted self-center mr-1 uppercase font-bold">Compare</span>
                <button type="button" className={pill(compareMode === 'off')} onClick={() => setCompareMode('off')}>
                    Off
                </button>
                <button type="button" className={pill(compareMode === 'prevPeriod')} onClick={() => setCompareMode('prevPeriod')}>
                    Prev period
                </button>
                <button type="button" className={pill(compareMode === 'prevYear')} onClick={() => setCompareMode('prevYear')}>
                    Last year
                </button>
            </div>

            {selected && (
                <div className="rounded-lg border border-cdborder/60 bg-cdbg/40 px-4 py-3 text-center space-y-3">
                    <p className="text-[11px] uppercase font-bold text-cdmuted">Totals for {selected.label}</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-cdtext">
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Distance</div>
                            <div className="font-bold tabular-nums">{formatNlNumber(selected.distanceKm)} km</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Time</div>
                            <div className="font-bold tabular-nums">{formatDurationHoursMinutes(selected.movingTimeSec)}</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Elevation</div>
                            <div className="font-bold tabular-nums">{formatNlNumber(selected.elevationM)} m</div>
                        </div>
                        <div>
                            <div className="text-cdmuted text-[10px] uppercase font-bold">Load</div>
                            <div className="font-bold tabular-nums text-blue-400/95">{formatNlNumber(selected.load)}</div>
                        </div>
                    </div>
                    {typeof onOpenActivityLogDateRange === 'function' && selectionDateRange && (
                        <button
                            type="button"
                            onClick={() => onOpenActivityLogDateRange(selectionDateRange)}
                            className="inline-flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-lg border border-cdaccent/50 bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdaccent/10 cd-focus-ring"
                        >
                            <ExternalLink size={14} className="shrink-0" aria-hidden />
                            Open these rides in Activity log
                        </button>
                    )}
                </div>
            )}

            <ChartHost className="h-[280px] w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 4 }} {...CHART_A11Y_PROPS}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.65} vertical={false} />
                        <XAxis
                            dataKey="tick"
                            tick={{ fill: theme.axis, fontSize: 10 }}
                            interval={xInterval}
                            angle={chartData.length > 10 ? -32 : 0}
                            textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                            height={chartData.length > 10 ? 52 : 28}
                        />
                        <YAxis
                            tick={{ fill: theme.axis, fontSize: 10 }}
                            tickFormatter={yTickFormatter}
                            width={metricId === 'time' ? 44 : 36}
                        />
                        <Tooltip
                            content={(props) => (
                                <ChartTooltip
                                    {...props}
                                    label={props.payload?.[0]?.payload?.label ?? props.label}
                                    formatter={(value, name) => [formatTooltipMetricValue(value), name]}
                                />
                            )}
                            cursor={theme.cursor}
                        />
                        <Bar
                            name={BAR_SERIES_NAME}
                            dataKey="barValue"
                            radius={[4, 4, 0, 0]}
                            onClick={(_entry, index) => {
                                if (typeof index === 'number' && chartData[index]) {
                                    setSelectedKey(chartData[index].key);
                                }
                            }}
                            cursor="pointer"
                        >
                            {chartData.map((_, i) => (
                                <Cell
                                    key={`cell-${i}`}
                                    fill={i === selectedIndex ? 'rgba(59, 130, 246, 0.95)' : 'rgba(59, 130, 246, 0.55)'}
                                    stroke={i === selectedIndex ? 'rgba(147, 197, 253, 0.9)' : 'transparent'}
                                    strokeWidth={i === selectedIndex ? 2 : 0}
                                />
                            ))}
                        </Bar>
                        {compareMode !== 'off' && (
                            <Bar
                                name={compareMode === 'prevYear' ? COMPARE_YEAR : COMPARE_PREV}
                                dataKey="compareBar"
                                fill="rgba(168, 85, 247, 0.42)"
                                stroke="rgba(168, 85, 247, 0.75)"
                                strokeWidth={1}
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        )}
                        <Line
                            type="monotone"
                            name={trendSeriesName(chartData[0]?.trendWindow ?? 4)}
                            dataKey="trendValue"
                            stroke={STRAVA_ORANGE}
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                            activeDot={{ r: 4, fill: STRAVA_ORANGE, stroke: '#fff', strokeWidth: 1 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartHost>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-[10px] text-cdmuted">
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-blue-500/80" aria-hidden />
                    {BAR_SERIES_NAME} (bars)
                </span>
                {compareMode !== 'off' && (
                    <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-purple-500/50 border border-purple-400/60" aria-hidden />
                        {compareMode === 'prevYear' ? COMPARE_YEAR : COMPARE_PREV}
                    </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-7 h-0.5 rounded-full" style={{ backgroundColor: STRAVA_ORANGE }} aria-hidden />
                    {trendSeriesName(chartData[0]?.trendWindow ?? 4)}
                </span>
            </div>
            <p className="text-[10px] text-cdmuted text-center">
                Prev period aligns trailing buckets; last year matches the same week, month, or year one calendar period back. Orange line = rolling average.
            </p>
        </div>
    );
};

export default VolumeTotalsChart;
