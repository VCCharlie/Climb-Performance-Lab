import { formatTotalMovingTime } from './activityLogFilterAnalytics';
import { formatNlNumber } from './formatters';
import {
    FILTER_ANALYTICS_METRIC_LABELS,
    normalizeVisibleMetricKeys,
} from './filterAnalyticsMetrics';

/**
 * Year-table column definitions keyed by filter analytics metric id.
 * @typedef {{ key: string, header: string, getValue: (row: object) => string | number | null, hasData?: (row: object) => boolean }} YearTableColumnDef
 */

/** @type {Record<string, YearTableColumnDef>} */
export const FILTER_ANALYTICS_YEAR_TABLE_COLUMNS = {
    activities: {
        key: 'activities',
        header: 'Rides',
        getValue: (row) => row.rideCount,
        hasData: (row) => row.rideCount > 0,
    },
    distance_total: {
        key: 'distance_total',
        header: 'Distance',
        getValue: (row) => `${formatNlNumber(row.distanceKm, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`,
        hasData: (row) => row.distanceKm > 0,
    },
    distance_avg: {
        key: 'distance_avg',
        header: 'Dist (avg)',
        getValue: (row) => (row.avgDistanceKm != null
            ? `${formatNlNumber(row.avgDistanceKm, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
            : '—'),
        hasData: (row) => row.avgDistanceKm != null && row.avgDistanceKm > 0,
    },
    time_total: {
        key: 'time_total',
        header: 'Time',
        getValue: (row) => formatTotalMovingTime(row.movingTimeSec),
        hasData: (row) => row.movingTimeSec > 0,
    },
    time_avg: {
        key: 'time_avg',
        header: 'Dur (avg)',
        getValue: (row) => (row.avgMovingTimeSec
            ? formatTotalMovingTime(row.avgMovingTimeSec)
            : '—'),
        hasData: (row) => row.avgMovingTimeSec > 0,
    },
    elevation_total: {
        key: 'elevation_total',
        header: 'Elev',
        getValue: (row) => `${row.elevationM} m`,
        hasData: (row) => row.elevationM > 0,
    },
    elevation_avg: {
        key: 'elevation_avg',
        header: 'Elev (avg)',
        getValue: (row) => (row.avgElevationM != null && row.avgElevationM > 0
            ? `${row.avgElevationM} m`
            : '—'),
        hasData: (row) => row.avgElevationM != null && row.avgElevationM > 0,
    },
    tss_total: {
        key: 'tss_total',
        header: 'TSS',
        getValue: (row) => (row.loadSum > 0 ? row.loadSum : '—'),
        hasData: (row) => row.loadSum > 0,
    },
    tss_avg: {
        key: 'tss_avg',
        header: 'TSS (avg)',
        getValue: (row) => (row.avgLoad != null && row.avgLoad > 0 ? row.avgLoad : '—'),
        hasData: (row) => row.avgLoad != null && row.avgLoad > 0,
    },
    avg_np: {
        key: 'avg_np',
        header: 'Avg NP',
        getValue: (row) => (row.avgNormPower != null ? `${row.avgNormPower} W` : '—'),
        hasData: (row) => row.avgNormPower != null && row.avgNormPower > 0,
    },
    avg_power: {
        key: 'avg_power',
        header: 'Avg power',
        getValue: (row) => (row.avgPower != null ? `${row.avgPower} W` : '—'),
        hasData: (row) => row.avgPower != null && row.avgPower > 0,
    },
    avg_if: {
        key: 'avg_if',
        header: 'Avg IF',
        getValue: (row) => (row.avgIntensityFactor != null
            ? row.avgIntensityFactor.toFixed(2)
            : '—'),
        hasData: (row) => row.avgIntensityFactor != null && row.avgIntensityFactor > 0,
    },
    avg_hr: {
        key: 'avg_hr',
        header: 'Avg HR',
        getValue: (row) => (row.avgHeartRate != null ? `${row.avgHeartRate} bpm` : '—'),
        hasData: (row) => row.avgHeartRate != null && row.avgHeartRate > 0,
    },
    avg_speed: {
        key: 'avg_speed',
        header: 'Avg speed',
        getValue: (row) => (row.avgSpeedKmh != null ? `${row.avgSpeedKmh} km/h` : '—'),
        hasData: (row) => row.avgSpeedKmh != null && row.avgSpeedKmh > 0,
    },
};

/**
 * @param {string[]} visibleKeys
 * @param {object[]} rows
 * @returns {YearTableColumnDef[]}
 */
export function buildYearTableColumns(visibleKeys, rows = []) {
    const keys = normalizeVisibleMetricKeys(visibleKeys);
    const columns = keys
        .map((key) => FILTER_ANALYTICS_YEAR_TABLE_COLUMNS[key])
        .filter(Boolean);

    if (!rows.length) return columns;

    return columns.filter((col) => rows.some((row) => col.hasData?.(row)));
}

/**
 * Compact summary chip keys for the bar above the year table (not picker-controlled).
 * @param {ReturnType<import('./activityLogFilterAnalytics').computeActivityLogFilterAnalytics>} analytics
 * @param {{ keys?: string[] } | null} contextProfile
 */
export function buildFilterAnalyticsSummaryChipKeys(analytics, contextProfile = null) {
    if (contextProfile?.keys?.length) {
        return contextProfile.keys.filter((key) => key !== 'activities').slice(0, 5);
    }
    const keys = ['distance_total', 'time_total', 'elevation_total'];
    if (analytics?.totalLoad > 0) keys.push('tss_total');
    return keys;
}

/**
 * @param {ReturnType<import('./activityLogFilterAnalytics').computeActivityLogFilterAnalytics>} analytics
 * @param {string[]} keys
 */
export function buildFilterAnalyticsSummaryChips(analytics, keys) {
    if (!analytics) return [];
    const chipKeys = ['activities', ...keys.filter((k) => k !== 'activities')];
    return chipKeys
        .map((key) => {
            const col = FILTER_ANALYTICS_YEAR_TABLE_COLUMNS[key];
            if (!col) return null;
            const label = FILTER_ANALYTICS_METRIC_LABELS[key] || col.header;
            let value;
            let sub = null;

            switch (key) {
                case 'activities':
                    value = String(analytics.rideCount);
                    sub = analytics.rideCountPct != null
                        ? `${analytics.rideCount} of ${analytics.totalRideCount} · ${analytics.rideCountPct}% of log`
                        : null;
                    break;
                case 'distance_total':
                    value = `${analytics.formatted.distanceKm} km`;
                    sub = analytics.distancePctOfAll != null ? `${analytics.distancePctOfAll}% of log` : null;
                    break;
                case 'distance_avg':
                    value = analytics.avgDistanceKm != null
                        ? `${analytics.formatted.avgDistanceKm} km`
                        : '—';
                    sub = 'per activity';
                    break;
                case 'time_total':
                    value = analytics.movingTimeLabel;
                    sub = analytics.movingTimePctOfAll != null ? `${analytics.movingTimePctOfAll}% of log` : null;
                    break;
                case 'time_avg':
                    value = analytics.avgMovingTimeLabel || '—';
                    sub = 'per activity';
                    break;
                case 'elevation_total':
                    value = `${analytics.formatted.elevationM} m`;
                    sub = analytics.elevationPctOfAll != null ? `${analytics.elevationPctOfAll}% of log` : null;
                    break;
                case 'elevation_avg':
                    value = analytics.avgElevationM != null
                        ? `${analytics.formatted.avgElevationM} m`
                        : '—';
                    sub = 'per activity';
                    break;
                case 'tss_total':
                    value = analytics.formatted.totalLoad;
                    sub = analytics.loadPctOfAll != null ? `${analytics.loadPctOfAll}% of log` : null;
                    break;
                case 'tss_avg':
                    value = analytics.formatted.avgLoad || '—';
                    sub = 'per activity';
                    break;
                case 'avg_np':
                    value = analytics.avgNormPower != null ? `${analytics.avgNormPower} W` : '—';
                    break;
                case 'avg_power':
                    value = analytics.avgPower != null ? `${analytics.avgPower} W` : '—';
                    break;
                case 'avg_if':
                    value = analytics.avgIntensityFactor != null
                        ? analytics.avgIntensityFactor.toFixed(2)
                        : '—';
                    break;
                case 'avg_hr':
                    value = analytics.avgHeartRate != null ? `${analytics.avgHeartRate} bpm` : '—';
                    break;
                case 'avg_speed':
                    value = analytics.avgSpeedKmh != null ? `${analytics.avgSpeedKmh} km/h` : '—';
                    break;
                default:
                    return null;
            }

            return {
                key,
                label,
                value,
                sub,
                accent: key === 'activities',
            };
        })
        .filter(Boolean);
}

/** @type {Record<string, { dataKey: string, title: string, subtitle: string, colorKey: string, allowDecimals?: boolean, formatTooltip: (value: number) => [string, string] }>} */
export const FILTER_ANALYTICS_YEAR_CHART_SERIES = {
    activities: {
        dataKey: 'rideCount',
        title: 'Rides per year',
        subtitle: 'Activity count per calendar year',
        colorKey: 'primary',
        allowDecimals: false,
        formatTooltip: (value) => [String(value), 'Rides'],
    },
    distance_total: {
        dataKey: 'distanceKm',
        title: 'Distance per year',
        subtitle: 'Total km per calendar year',
        colorKey: 'blue',
        formatTooltip: (value) => [
            `${formatNlNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`,
            'Distance',
        ],
    },
    distance_avg: {
        dataKey: 'avgDistanceKm',
        title: 'Average distance per year',
        subtitle: 'Mean km per activity each year',
        colorKey: 'blue',
        formatTooltip: (value) => [
            `${formatNlNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`,
            'Dist (avg)',
        ],
    },
    time_total: {
        dataKey: 'movingHours',
        title: 'Moving time per year',
        subtitle: 'Total hours per calendar year',
        colorKey: 'green',
        formatTooltip: (value) => [`${value} h`, 'Time'],
    },
    time_avg: {
        dataKey: 'avgMovingHours',
        title: 'Average duration per year',
        subtitle: 'Mean hours per activity each year',
        colorKey: 'green',
        formatTooltip: (value) => [`${value} h`, 'Dur (avg)'],
    },
    elevation_total: {
        dataKey: 'elevationM',
        title: 'Elevation per year',
        subtitle: 'Total climbing meters per calendar year',
        colorKey: 'primary',
        allowDecimals: false,
        formatTooltip: (value) => [`${value} m`, 'Elev'],
    },
    elevation_avg: {
        dataKey: 'avgElevationM',
        title: 'Average elevation per year',
        subtitle: 'Mean climbing meters per activity each year',
        colorKey: 'primary',
        allowDecimals: false,
        formatTooltip: (value) => [`${value} m`, 'Elev (avg)'],
    },
    tss_total: {
        dataKey: 'loadSum',
        title: 'Training load per year',
        subtitle: 'Total TSS per calendar year',
        colorKey: 'green',
        allowDecimals: false,
        formatTooltip: (value) => [String(value), 'TSS'],
    },
    tss_avg: {
        dataKey: 'avgLoad',
        title: 'Average TSS per year',
        subtitle: 'Mean TSS per activity each year',
        colorKey: 'green',
        allowDecimals: false,
        formatTooltip: (value) => [String(value), 'TSS (avg)'],
    },
    avg_np: {
        dataKey: 'avgNormPower',
        title: 'Average NP per year',
        subtitle: 'Mean normalized power each year',
        colorKey: 'blue',
        allowDecimals: false,
        formatTooltip: (value) => [`${value} W`, 'Avg NP'],
    },
    avg_power: {
        dataKey: 'avgPower',
        title: 'Average power per year',
        subtitle: 'Mean average power each year',
        colorKey: 'blue',
        allowDecimals: false,
        formatTooltip: (value) => [`${value} W`, 'Avg power'],
    },
    avg_if: {
        dataKey: 'avgIntensityFactor',
        title: 'Average IF per year',
        subtitle: 'Mean intensity factor each year',
        colorKey: 'primary',
        formatTooltip: (value) => [Number(value).toFixed(2), 'Avg IF'],
    },
    avg_hr: {
        dataKey: 'avgHeartRate',
        title: 'Average HR per year',
        subtitle: 'Mean heart rate each year',
        colorKey: 'green',
        allowDecimals: false,
        formatTooltip: (value) => [`${value} bpm`, 'Avg HR'],
    },
    avg_speed: {
        dataKey: 'avgSpeedKmh',
        title: 'Average speed per year',
        subtitle: 'Mean speed each year',
        colorKey: 'blue',
        formatTooltip: (value) => [`${value} km/h`, 'Avg speed'],
    },
};

/**
 * Chart rows (ascending year) with numeric fields for Recharts.
 * @param {object[]} byYear
 */
export function buildFilterAnalyticsYearChartData(byYear = []) {
    return [...byYear].reverse().map((row) => ({
        year: row.year,
        rideCount: row.rideCount,
        distanceKm: row.distanceKm,
        avgDistanceKm: row.avgDistanceKm,
        movingHours: Math.round((row.movingTimeSec / 3600) * 10) / 10,
        avgMovingHours: row.avgMovingTimeSec
            ? Math.round((row.avgMovingTimeSec / 3600) * 10) / 10
            : null,
        elevationM: row.elevationM,
        avgElevationM: row.avgElevationM,
        loadSum: row.loadSum || 0,
        avgLoad: row.avgLoad,
        avgNormPower: row.avgNormPower,
        avgPower: row.avgPower,
        avgIntensityFactor: row.avgIntensityFactor,
        avgHeartRate: row.avgHeartRate,
        avgSpeedKmh: row.avgSpeedKmh,
    }));
}

/**
 * Build one bar chart per visible year-table column that supports charting.
 * @param {string[]} visibleKeys
 * @param {object[]} rows
 */
export function buildYearChartSeries(visibleKeys, rows = []) {
    const tableColumns = buildYearTableColumns(visibleKeys, rows);
    return tableColumns
        .map((col) => {
            const spec = FILTER_ANALYTICS_YEAR_CHART_SERIES[col.key];
            if (!spec) return null;
            return {
                key: col.key,
                ...spec,
            };
        })
        .filter(Boolean);
}
