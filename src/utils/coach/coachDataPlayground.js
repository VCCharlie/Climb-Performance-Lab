/**
 * Trend + comparison aggregations for the Coach Data Playground.
 */

import { normalizeDate } from '../formatters';
import {
    buildMonthlyVolumeTotals,
    buildWeeklyVolumeTotals,
    orderVolumeRowsChronological,
    trailingMovingAverage,
    formatMonthChartTickEn,
    formatWeekChartTickEn,
    addDaysToYmd,
} from '../dashboardVolumeTotals';
import {
    boundsFromYmdRange,
    boundsToYmdPair,
    previousWindowBounds,
    compareDaysBeforeWindow,
} from '../dashboardActivityWindow';
import { filterActivitiesInRange } from './coachHelpers';

export const PLAYGROUND_METRICS = [
    { id: 'distanceKm', label: 'Distance', unit: 'km', decimals: 0 },
    { id: 'elevationM', label: 'Elevation', unit: 'm', decimals: 0 },
    { id: 'load', label: 'Load (TSS)', unit: '', decimals: 0 },
    { id: 'hours', label: 'Moving time', unit: 'h', decimals: 1 },
    { id: 'rideCount', label: 'Rides', unit: '', decimals: 0 },
];

function isRideType(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('ride') || t.includes('virtual') || t.includes('gravel') || t.includes('mountain');
}

function filterRides(activities) {
    return (activities || []).filter((a) => isRideType(a.type));
}

function metricValue(metricId, bucket) {
    switch (metricId) {
        case 'distanceKm': return bucket.distanceKm;
        case 'elevationM': return bucket.elevationM;
        case 'load': return bucket.load;
        case 'hours': return Math.round((bucket.movingTimeSec / 3600) * 10) / 10;
        case 'rideCount': return bucket.rideCount;
        default: return bucket.distanceKm;
    }
}

function roundMetric(metricId, value) {
    const metric = PLAYGROUND_METRICS.find((m) => m.id === metricId);
    const decimals = metric?.decimals ?? 0;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * @param {string} compareMode
 * @param {string} primaryStart
 * @param {string} primaryEnd
 * @param {number} [compareDays]
 */
export function resolvePlaygroundCompareRange(compareMode, primaryStart, primaryEnd, compareDays = 365) {
    const bounds = boundsFromYmdRange(primaryStart, primaryEnd);
    if (!bounds || compareMode === 'none') return null;

    if (compareMode === 'previous') {
        return boundsToYmdPair(previousWindowBounds(bounds));
    }
    if (compareMode === 'days') {
        return boundsToYmdPair(compareDaysBeforeWindow(bounds, compareDays));
    }
    if (compareMode === 'prevYear') {
        const shiftYear = (ymd, delta) => {
            const y = parseInt(ymd.slice(0, 4), 10) + delta;
            return `${y}${ymd.slice(4)}`;
        };
        return {
            startYmd: shiftYear(primaryStart, -1),
            endYmd: shiftYear(primaryEnd, -1),
        };
    }
    return null;
}

/**
 * @param {object[]} activities
 * @param {object} options
 */
export function buildTrendPlaygroundData(activities, options = {}) {
    const {
        cadence = 'monthly',
        metricId = 'distanceKm',
        startYmd,
        endYmd,
        compareStartYmd,
        compareEndYmd,
        compareMode = 'none',
        trendWindow = 3,
    } = options;

    const metric = PLAYGROUND_METRICS.find((m) => m.id === metricId) || PLAYGROUND_METRICS[0];
    const rides = filterRides(activities);

    const primaryActs = startYmd && endYmd
        ? filterActivitiesInRange(rides, startYmd, endYmd)
        : rides;

    const rawRows = cadence === 'weekly'
        ? buildWeeklyVolumeTotals(primaryActs)
        : buildMonthlyVolumeTotals(primaryActs);

    const chronological = orderVolumeRowsChronological(rawRows);
    const values = chronological.map((row) => metricValue(metricId, row));
    const trend = trailingMovingAverage(values, trendWindow);

    let compareChronological = [];
    if (compareMode !== 'none' && compareStartYmd && compareEndYmd) {
        const compareActs = filterActivitiesInRange(rides, compareStartYmd, compareEndYmd);
        compareChronological = orderVolumeRowsChronological(
            cadence === 'weekly'
                ? buildWeeklyVolumeTotals(compareActs)
                : buildMonthlyVolumeTotals(compareActs),
        );
    }

    const chartData = chronological.map((row, index) => {
        const compareRow = compareChronological[index];
        return {
            key: row.key,
            label: cadence === 'weekly' ? formatWeekChartTickEn(row.key) : formatMonthChartTickEn(row.key),
            value: roundMetric(metricId, metricValue(metricId, row)),
            trend: roundMetric(metricId, trend[index]),
            compareValue: compareRow != null
                ? roundMetric(metricId, metricValue(metricId, compareRow))
                : null,
            rideCount: row.rideCount,
        };
    });

    const primaryTotal = roundMetric(metricId, values.reduce((sum, v) => sum + v, 0));
    const compareTotal = compareChronological.length
        ? roundMetric(
            metricId,
            compareChronological.reduce((sum, row) => sum + metricValue(metricId, row), 0),
        )
        : null;

    const deltaPct = compareTotal != null && compareTotal > 0
        ? Math.round(((primaryTotal - compareTotal) / compareTotal) * 100)
        : null;

    return {
        chartData,
        metric,
        primaryTotal,
        compareTotal,
        deltaPct,
        bucketCount: chronological.length,
    };
}

/**
 * Default primary window: last 3 calendar years through today.
 * @param {string} [referenceYmd]
 */
export function defaultPlaygroundPrimaryRange(referenceYmd) {
    const end = referenceYmd || normalizeDate(new Date()) || todayFallback();
    const startYear = parseInt(end.slice(0, 4), 10) - 2;
    return { startYmd: `${startYear}-01-01`, endYmd: end };
}

function todayFallback() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Shift YMD range by whole years (for year presets).
 */
export function playgroundRangeForYears(endYmd, years) {
    const endYear = parseInt(endYmd.slice(0, 4), 10);
    const startYear = endYear - years + 1;
    return {
        startYmd: `${startYear}-01-01`,
        endYmd: endYmd,
    };
}

/**
 * @param {string} endYmd
 * @param {number} months
 */
export function playgroundRangeForMonths(endYmd, months) {
    const start = addDaysToYmd(endYmd, -(months * 31));
    return { startYmd: start || endYmd, endYmd };
}
