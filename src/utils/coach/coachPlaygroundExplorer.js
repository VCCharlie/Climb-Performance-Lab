/**
 * Free-form metric explorer: combine any metrics per ride or time bucket.
 */

import { normalizeDate } from '../formatters';
import { activityDistanceKm, activityMovingTimeSec, activityAvgSpeedKmh } from '../activityFilterMetrics';
import { activityEfficiencyFactor } from '../rideInsights';
import { filterActivitiesInRange } from './coachHelpers';
import { buildPlaygroundBuckets, bucketMetricValue } from './coachPlaygroundBuckets';
import {
    getExplorerMetric,
    roundExplorerValue,
    POWER_PEAK_FIELDS,
} from './coachPlaygroundMetrics';

export const RIDE_ENVIRONMENT = {
    ALL: 'all',
    OUTDOOR: 'outdoor',
    INDOOR: 'indoor',
};

/**
 * @param {object} activity
 */
export function isIndoorActivity(activity) {
    const t = String(activity?.type || '').toLowerCase();
    return t === 'virtualride' || t.includes('virtual') || t.includes('indoor');
}

function filterByEnvironment(activities, rideEnvironment) {
    if (!rideEnvironment || rideEnvironment === RIDE_ENVIRONMENT.ALL) return activities;
    if (rideEnvironment === RIDE_ENVIRONMENT.INDOOR) {
        return activities.filter((a) => isIndoorActivity(a));
    }
    return activities.filter((a) => !isIndoorActivity(a));
}

function isRideType(type) {
    const t = String(type || '').toLowerCase();
    return t.includes('ride') || t.includes('virtual') || t.includes('gravel') || t.includes('mountain');
}

function filterRides(activities) {
    return (activities || []).filter((a) => isRideType(a.type));
}

function activityPeakValue(activity, field) {
    const n = Number(activity?.[field]);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Single-ride metric value (for per-ride explorer points).
 * @param {object} activity
 * @param {string} metricId
 */
export function activityMetricValue(activity, metricId) {
    const peakMatch = metricId.match(/^(best_\w+min)_(avg|max|topN)$/);
    if (peakMatch) {
        const [, field] = peakMatch;
        return activityPeakValue(activity, field);
    }

    const dk = activityDistanceKm(activity);
    const mt = activityMovingTimeSec(activity);

    switch (metricId) {
        case 'distanceKm': return dk;
        case 'elevationM': {
            const el = Number(activity?.climbing);
            return Number.isFinite(el) && el > 0 ? el : null;
        }
        case 'load': {
            const ld = Number(activity?.load);
            return Number.isFinite(ld) && ld > 0 ? ld : null;
        }
        case 'hours': return mt != null ? mt / 3600 : null;
        case 'rideCount': return 1;
        case 'workKj': {
            const w = Number(activity?.work);
            return Number.isFinite(w) && w > 0 ? w : null;
        }
        case 'avgHr': {
            const hr = Number(activity?.avg_hr);
            return Number.isFinite(hr) && hr > 0 ? hr : null;
        }
        case 'maxHr': {
            const hr = Number(activity?.max_hr);
            return Number.isFinite(hr) && hr > 0 ? hr : null;
        }
        case 'normPower': {
            const np = Number(activity?.norm_power);
            return Number.isFinite(np) && np > 0 ? np : null;
        }
        case 'avgPower': {
            const ap = Number(activity?.avg_power);
            return Number.isFinite(ap) && ap > 0 ? ap : null;
        }
        case 'avgSpeed': return activityAvgSpeedKmh(activity, dk, mt);
        case 'rpe': {
            const rpe = Number(activity?.rpe);
            return Number.isFinite(rpe) && rpe > 0 ? rpe : null;
        }
        case 'efficiencyFactor':
            return activityEfficiencyFactor(activity?.norm_power, activity?.avg_hr);
        case 'decouplingPct': {
            const pct = Number(activity?.decoupling_pct);
            return Number.isFinite(pct) ? pct : null;
        }
        case 'thresholdDriftPct': {
            const pct = Number(activity?.threshold_drift_pct);
            return Number.isFinite(pct) ? pct : null;
        }
        case 'raceDriftPct': {
            const pct = Number(activity?.race_drift_pct);
            return Number.isFinite(pct) ? pct : null;
        }
        default: return null;
    }
}

/**
 * @param {{ x: number, y: number }[]} points
 */
export function pearsonCorrelation(points) {
    const valid = points.filter((p) => p.x != null && p.y != null && !Number.isNaN(p.x) && !Number.isNaN(p.y));
    if (valid.length < 3) return null;

    const xs = valid.map((p) => p.x);
    const ys = valid.map((p) => p.y);
    const n = xs.length;
    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i += 1) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    if (!den) return null;
    return Math.round((num / den) * 1000) / 1000;
}

function resolveMetricValue(source, metricId, options) {
    const metric = getExplorerMetric(metricId);
    const raw = source.type === 'ride'
        ? activityMetricValue(source.data, metricId)
        : bucketMetricValue(source.data, metricId, 'primary', options);
    return roundExplorerValue(raw, metric);
}

/**
 * @param {object[]} activities
 * @param {object} options
 */
export function buildExplorerData(activities, options = {}) {
    const {
        cadence = 'yearly',
        startYmd,
        endYmd,
        xMetric = 'avgHr',
        yMetric = 'avgSpeed',
        colorMetric = '',
        sizeMetric = '',
        topN = 10,
        maxPoints = 500,
        rideEnvironment = RIDE_ENVIRONMENT.ALL,
        excludeZeros = false,
    } = options;

    const rides = filterByEnvironment(filterRides(activities), rideEnvironment);
    const filtered = startYmd && endYmd
        ? filterActivitiesInRange(rides, startYmd, endYmd)
        : rides;

    const metricOpts = { topN };
    const xMeta = getExplorerMetric(xMetric);
    const yMeta = getExplorerMetric(yMetric);
    const colorMeta = colorMetric ? getExplorerMetric(colorMetric) : null;
    const sizeMeta = sizeMetric ? getExplorerMetric(sizeMetric) : null;

    let sources = [];

    if (cadence === 'ride') {
        sources = filtered
            .slice()
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(-maxPoints)
            .map((a) => ({
                type: 'ride',
                key: a.id || `${a.date}-${a.title || 'ride'}`,
                label: a.title || a.date || 'Ride',
                data: a,
            }));
    } else {
        const buckets = buildPlaygroundBuckets(filtered, cadence);
        sources = buckets.map((b) => ({
            type: 'bucket',
            key: b.key,
            label: b.label,
            data: b,
        }));
    }

    const points = sources.map((source) => {
        const x = resolveMetricValue(source, xMetric, metricOpts);
        const y = resolveMetricValue(source, yMetric, metricOpts);
        const color = colorMetric ? resolveMetricValue(source, colorMetric, metricOpts) : null;
        const size = sizeMetric ? resolveMetricValue(source, sizeMetric, metricOpts) : null;
        const rideCount = source.type === 'ride' ? 1 : source.data.rideCount;

        return {
            key: source.key,
            label: source.label,
            x,
            y,
            color,
            size,
            rideCount,
            xMetric: xMeta.label,
            yMetric: yMeta.label,
            colorMetric: colorMeta?.label,
            sizeMetric: sizeMeta?.label,
        };
    }).filter((p) => p.x != null || p.y != null);

    const filteredPoints = excludeZeros
        ? points.filter((p) => (p.x == null || p.x > 0) && (p.y == null || p.y > 0))
        : points;

    const scatterPoints = filteredPoints.filter((p) => p.x != null && p.y != null);
    const correlation = pearsonCorrelation(scatterPoints);

    const timelineData = filteredPoints.map((p) => ({
        key: p.key,
        label: p.label,
        xValue: p.x,
        yValue: p.y,
        colorValue: p.color,
        rideCount: p.rideCount,
    }));

    return {
        points: filteredPoints,
        scatterPoints,
        timelineData,
        correlation,
        xMeta,
        yMeta,
        colorMeta,
        sizeMeta,
        pointCount: filteredPoints.length,
        validScatterCount: scatterPoints.length,
    };
}

export { POWER_PEAK_FIELDS };
