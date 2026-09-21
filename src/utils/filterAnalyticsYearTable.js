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
