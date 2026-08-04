/**
 * Time-bucket aggregation for playground trends (week / month / year).
 */

import { normalizeDate, formatDateDDMMYYYY } from '../formatters';
import { activityDistanceKm, activityMovingTimeSec } from '../activityFilterMetrics';
import { ymdToMondayYmd, addDaysToYmd } from '../dashboardVolumeTotals';
import { movingTimeSec } from './coachHelpers';

function emptyExtendedBucket() {
    return {
        rideCount: 0,
        distanceKm: 0,
        elevationM: 0,
        movingTimeSec: 0,
        load: 0,
        workKj: 0,
        hrWeightedSum: 0,
        hrWeightSec: 0,
        maxHr: 0,
        maxDistanceKm: 0,
        maxLoad: 0,
    };
}

function addActivityToBucket(bucket, activity) {
    bucket.rideCount += 1;
    const dk = activityDistanceKm(activity);
    if (dk != null && !Number.isNaN(dk)) bucket.distanceKm += dk;
    const el = Number(activity?.climbing);
    if (!Number.isNaN(el) && el > 0) bucket.elevationM += el;
    const mt = activityMovingTimeSec(activity);
    if (mt != null && !Number.isNaN(mt) && mt > 0) bucket.movingTimeSec += mt;
    const ld = Number(activity?.load);
    if (!Number.isNaN(ld) && ld > 0) bucket.load += ld;

    const work = Number(activity.work) || 0;
    if (work > 0) bucket.workKj += work;

    const sec = movingTimeSec(activity.moving_time) || mt || 0;
    const avgHr = Number(activity.avg_hr) || 0;
    if (avgHr > 0 && sec > 0) {
        bucket.hrWeightedSum += avgHr * sec;
        bucket.hrWeightSec += sec;
    }
    const maxHr = Number(activity.max_hr) || 0;
    if (maxHr > bucket.maxHr) bucket.maxHr = maxHr;

    const dist = Number(activity.distance) || 0;
    if (dist > bucket.maxDistanceKm) bucket.maxDistanceKm = dist;
    const load = Number(activity.load) || 0;
    if (load > bucket.maxLoad) bucket.maxLoad = load;
}

function finalizeBucket(bucket) {
    return {
        ...bucket,
        elevationM: Math.round(bucket.elevationM),
        distanceKm: Math.round(bucket.distanceKm * 10) / 10,
        load: Math.round(bucket.load),
        workKj: Math.round(bucket.workKj),
        hours: Math.round((bucket.movingTimeSec / 3600) * 10) / 10,
        avgHr: bucket.hrWeightSec > 0
            ? Math.round(bucket.hrWeightedSum / bucket.hrWeightSec)
            : 0,
        maxHr: bucket.maxHr || 0,
        maxDistanceKm: Math.round(bucket.maxDistanceKm * 10) / 10,
        maxLoad: Math.round(bucket.maxLoad),
    };
}

function formatWeekLabel(mondayYmd) {
    const sun = addDaysToYmd(mondayYmd, 6);
    const a = formatDateDDMMYYYY(mondayYmd);
    const b = formatDateDDMMYYYY(sun);
    return a === '-' || b === '-' ? mondayYmd : `${a} – ${b}`;
}

function formatMonthLabel(monthKey) {
    const label = formatDateDDMMYYYY(`${monthKey}-01`);
    return label === '-' ? monthKey : label.slice(3);
}

/**
 * @param {object[]} activities
 * @param {'weekly' | 'monthly' | 'yearly'} cadence
 */
export function buildPlaygroundBuckets(activities, cadence) {
    const map = new Map();

    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd) continue;

        let key;
        if (cadence === 'yearly') {
            key = ymd.slice(0, 4);
        } else if (cadence === 'monthly') {
            key = ymd.slice(0, 7);
        } else {
            key = ymdToMondayYmd(ymd);
            if (!key) continue;
        }

        if (!map.has(key)) map.set(key, emptyExtendedBucket());
        addActivityToBucket(map.get(key), a);
    }

    return [...map.entries()]
        .map(([key, bucket]) => {
            const finalized = finalizeBucket(bucket);
            let label = key;
            if (cadence === 'weekly') label = formatWeekLabel(key);
            else if (cadence === 'monthly') label = formatMonthLabel(key);
            return { key, label, ...finalized };
        })
        .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * @param {object} bucket
 * @param {string} metricId
 * @param {'primary' | 'max'} statMode
 */
export function bucketMetricValue(bucket, metricId, statMode = 'primary') {
    if (statMode === 'max') {
        switch (metricId) {
            case 'distanceKm': return bucket.maxDistanceKm;
            case 'load': return bucket.maxLoad;
            case 'maxHr': return bucket.maxHr;
            default: break;
        }
    }
    switch (metricId) {
        case 'distanceKm': return bucket.distanceKm;
        case 'elevationM': return bucket.elevationM;
        case 'load': return bucket.load;
        case 'hours': return bucket.hours;
        case 'rideCount': return bucket.rideCount;
        case 'workKj': return bucket.workKj;
        case 'avgHr': return bucket.avgHr;
        case 'maxHr': return bucket.maxHr;
        default: return bucket.distanceKm;
    }
}
