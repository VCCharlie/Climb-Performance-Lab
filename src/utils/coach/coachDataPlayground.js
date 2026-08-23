/**
 * Trend + comparison aggregations for the Coach Data Playground.
 */

import { normalizeDate } from '../formatters';
import { trailingMovingAverage, addDaysToYmd } from '../dashboardVolumeTotals';
import {
    boundsFromYmdRange,
    boundsToYmdPair,
    previousWindowBounds,
    compareDaysBeforeWindow,
} from '../dashboardActivityWindow';
import { filterActivitiesInRange } from './coachHelpers';
import { buildPlaygroundBuckets, bucketMetricValue } from './coachPlaygroundBuckets';
import { getPlaygroundMetric, isDriftRelatedMetric } from './coachPlaygroundMetrics';

export {
    PLAYGROUND_METRICS,
    VOLUME_METRICS,
    HR_METRICS,
    PERFORMANCE_METRICS,
    DRIFT_METRICS,
    CHART_TYPES,
    CHART_TYPE_OPTIONS,
    VOLUME_STAT_MODES,
    VOLUME_STAT_OPTIONS,
    POWER_PEAK_FIELDS,
    ALL_EXPLORER_METRICS,
    EXPLORER_METRIC_GROUPS,
    isDriftRelatedMetric,
} from './coachPlaygroundMetrics';

export { buildExplorerData, pearsonCorrelation } from './coachPlaygroundExplorer';

function isRideType(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('ride') || t.includes('virtual') || t.includes('gravel') || t.includes('mountain');
}

function filterRides(activities) {
    return (activities || []).filter((a) => isRideType(a.type));
}

function roundMetric(metric, value) {
    const decimals = metric?.decimals ?? 0;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function driftPeriodFieldsFromBucket(row) {
    return {
        periodDecouplingPct: row.decouplingPctCount > 0 ? row.decouplingPct : null,
        periodThresholdDriftPct: row.thresholdDriftPctCount > 0 ? row.thresholdDriftPct : null,
        periodRaceDriftPct: row.raceDriftPctCount > 0 ? row.raceDriftPct : null,
        decouplingAnalyzedCount: row.decouplingPctCount || 0,
        thresholdAnalyzedCount: row.thresholdDriftPctCount || 0,
        raceAnalyzedCount: row.raceDriftPctCount || 0,
    };
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
        statMode = 'primary',
        startYmd,
        endYmd,
        compareStartYmd,
        compareEndYmd,
        compareMode = 'none',
        trendWindow = 3,
        profileFtp = 0,
    } = options;

    const metric = getPlaygroundMetric(metricId);
    const rides = filterRides(activities);

    const primaryActs = startYmd && endYmd
        ? filterActivitiesInRange(rides, startYmd, endYmd)
        : rides;

    const chronological = buildPlaygroundBuckets(primaryActs, cadence, profileFtp);
    const values = chronological.map((row) => bucketMetricValue(row, metricId, statMode));
    const trend = trailingMovingAverage(values, trendWindow);
    const maxValues = chronological.map((row) => bucketMetricValue(row, metricId, 'max'));
    const maxTrend = trailingMovingAverage(maxValues, trendWindow);

    let compareChronological = [];
    if (compareMode !== 'none' && compareStartYmd && compareEndYmd) {
        const compareActs = filterActivitiesInRange(rides, compareStartYmd, compareEndYmd);
        compareChronological = buildPlaygroundBuckets(compareActs, cadence, profileFtp);
    }

    const chartData = chronological.map((row, index) => {
        const compareRow = compareChronological[index];
        return {
            key: row.key,
            label: row.label,
            value: roundMetric(metric, values[index]),
            trend: roundMetric(metric, trend[index]),
            maxValue: roundMetric(metric, maxValues[index]),
            maxTrend: roundMetric(metric, maxTrend[index]),
            compareValue: compareRow != null
                ? roundMetric(metric, bucketMetricValue(compareRow, metricId, statMode))
                : null,
            rideCount: row.rideCount,
            trendWindow,
            count: row.rideCount,
            ...driftPeriodFieldsFromBucket(row),
        };
    });

    const primaryTotal = roundMetric(metric, values.reduce((sum, v) => sum + v, 0));
    const compareTotal = compareChronological.length
        ? roundMetric(
            metric,
            compareChronological.reduce((sum, row) => sum + bucketMetricValue(row, metricId, statMode), 0),
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
        isDriftRelated: isDriftRelatedMetric(metricId),
    };
}

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

export function playgroundRangeForYears(endYmd, years) {
    const endYear = parseInt(endYmd.slice(0, 4), 10);
    const startYear = endYear - years + 1;
    return {
        startYmd: `${startYear}-01-01`,
        endYmd: endYmd,
    };
}

export function playgroundRangeForMonths(endYmd, months) {
    const start = addDaysToYmd(endYmd, -(months * 31));
    return { startYmd: start || endYmd, endYmd };
}
