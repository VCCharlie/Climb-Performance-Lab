/**
 * Time-bucket aggregation for playground trends (week / month / year).
 */

import { normalizeDate, formatDateDDMMYYYY } from '../formatters';
import { activityDistanceKm, activityMovingTimeSec, activityAvgSpeedKmh } from '../activityFilterMetrics';
import { activityEfficiencyFactor } from '../rideInsights';
import { ymdToMondayYmd, addDaysToYmd } from '../dashboardVolumeTotals';
import { movingTimeSec } from './coachHelpers';
import { POWER_PEAK_FIELDS } from './coachPlaygroundMetrics';

function emptyPeakArrays() {
    const peaks = {};
    POWER_PEAK_FIELDS.forEach((p) => { peaks[p.id] = []; });
    return peaks;
}

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
        normPowerWeightedSum: 0,
        normPowerWeightSec: 0,
        avgPowerWeightedSum: 0,
        avgPowerWeightSec: 0,
        speedDistSum: 0,
        speedDistWeight: 0,
        rpeSum: 0,
        rpeCount: 0,
        maxDistanceKm: 0,
        maxLoad: 0,
        maxNormPower: 0,
        maxAvgPower: 0,
        maxAvgSpeed: 0,
        maxRpe: 0,
        efWeightedSum: 0,
        efWeightSec: 0,
        decouplingPctSum: 0,
        decouplingPctCount: 0,
        maxDecouplingPct: 0,
        thresholdDriftPctSum: 0,
        thresholdDriftPctCount: 0,
        maxThresholdDriftPct: 0,
        raceDriftPctSum: 0,
        raceDriftPctCount: 0,
        maxRaceDriftPct: 0,
        ifWeightedSum: 0,
        ifWeightSec: 0,
        maxIntensityFactor: 0,
        powerPeaks: emptyPeakArrays(),
    };
}

function pushPeak(peaks, field, value) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) peaks[field].push(n);
}

function addActivityToBucket(bucket, activity, profileFtp = 0) {
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

    const normPower = Number(activity.norm_power) || 0;
    if (normPower > 0 && sec > 0) {
        bucket.normPowerWeightedSum += normPower * sec;
        bucket.normPowerWeightSec += sec;
        if (normPower > bucket.maxNormPower) bucket.maxNormPower = normPower;
        const ftp = Number(profileFtp) || 0;
        if (ftp > 0) {
            const ifVal = normPower / ftp;
            bucket.ifWeightedSum += ifVal * sec;
            bucket.ifWeightSec += sec;
            if (ifVal > bucket.maxIntensityFactor) bucket.maxIntensityFactor = ifVal;
        }
    }

    const avgPower = Number(activity.avg_power) || 0;
    if (avgPower > 0 && sec > 0) {
        bucket.avgPowerWeightedSum += avgPower * sec;
        bucket.avgPowerWeightSec += sec;
        if (avgPower > bucket.maxAvgPower) bucket.maxAvgPower = avgPower;
    }

    const speed = activityAvgSpeedKmh(activity, dk, mt);
    if (speed != null && speed > 0 && dk != null && dk > 0) {
        bucket.speedDistSum += speed * dk;
        bucket.speedDistWeight += dk;
        if (speed > bucket.maxAvgSpeed) bucket.maxAvgSpeed = speed;
    }

    const rpe = Number(activity.rpe) || 0;
    if (rpe > 0) {
        bucket.rpeSum += rpe;
        bucket.rpeCount += 1;
        if (rpe > bucket.maxRpe) bucket.maxRpe = rpe;
    }

    POWER_PEAK_FIELDS.forEach((p) => pushPeak(bucket.powerPeaks, p.id, activity[p.id]));

    const ef = activityEfficiencyFactor(activity.norm_power, activity.avg_hr);
    if (ef != null && sec > 0) {
        bucket.efWeightedSum += ef * sec;
        bucket.efWeightSec += sec;
    }

    const decouplingPct = Number(activity.decoupling_pct);
    if (Number.isFinite(decouplingPct)) {
        bucket.decouplingPctSum += decouplingPct;
        bucket.decouplingPctCount += 1;
        if (decouplingPct > bucket.maxDecouplingPct) bucket.maxDecouplingPct = decouplingPct;
    }

    const thresholdDriftPct = Number(activity.threshold_drift_pct);
    if (Number.isFinite(thresholdDriftPct)) {
        bucket.thresholdDriftPctSum += thresholdDriftPct;
        bucket.thresholdDriftPctCount += 1;
        if (thresholdDriftPct > bucket.maxThresholdDriftPct) bucket.maxThresholdDriftPct = thresholdDriftPct;
    }

    const raceDriftPct = Number(activity.race_drift_pct);
    if (Number.isFinite(raceDriftPct)) {
        bucket.raceDriftPctSum += raceDriftPct;
        bucket.raceDriftPctCount += 1;
        if (raceDriftPct > bucket.maxRaceDriftPct) bucket.maxRaceDriftPct = raceDriftPct;
    }

    const dist = Number(activity.distance) || 0;
    if (dist > bucket.maxDistanceKm) bucket.maxDistanceKm = dist;
    const load = Number(activity.load) || 0;
    if (load > bucket.maxLoad) bucket.maxLoad = load;
}

function peakAgg(values, agg, topN = 10) {
    if (!values?.length) return null;
    if (agg === 'max') return Math.max(...values);
    if (agg === 'topN') {
        const sorted = [...values].sort((a, b) => b - a).slice(0, topN);
        return sorted.reduce((s, v) => s + v, 0) / sorted.length;
    }
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function finalizeBucket(bucket) {
    const avgHr = bucket.hrWeightSec > 0
        ? Math.round(bucket.hrWeightedSum / bucket.hrWeightSec)
        : 0;
    const normPower = bucket.normPowerWeightSec > 0
        ? Math.round(bucket.normPowerWeightedSum / bucket.normPowerWeightSec)
        : 0;
    const avgPower = bucket.avgPowerWeightSec > 0
        ? Math.round(bucket.avgPowerWeightedSum / bucket.avgPowerWeightSec)
        : 0;
    const avgSpeed = bucket.speedDistWeight > 0
        ? Math.round((bucket.speedDistSum / bucket.speedDistWeight) * 10) / 10
        : 0;
    const rpe = bucket.rpeCount > 0
        ? Math.round((bucket.rpeSum / bucket.rpeCount) * 10) / 10
        : 0;
    const efficiencyFactor = bucket.efWeightSec > 0
        ? Math.round((bucket.efWeightedSum / bucket.efWeightSec) * 100) / 100
        : 0;
    const intensityFactor = bucket.ifWeightSec > 0
        ? Math.round((bucket.ifWeightedSum / bucket.ifWeightSec) * 1000) / 1000
        : 0;
    const decouplingPct = bucket.decouplingPctCount > 0
        ? Math.round((bucket.decouplingPctSum / bucket.decouplingPctCount) * 10) / 10
        : 0;
    const thresholdDriftPct = bucket.thresholdDriftPctCount > 0
        ? Math.round((bucket.thresholdDriftPctSum / bucket.thresholdDriftPctCount) * 10) / 10
        : 0;
    const raceDriftPct = bucket.raceDriftPctCount > 0
        ? Math.round((bucket.raceDriftPctSum / bucket.raceDriftPctCount) * 10) / 10
        : 0;

    return {
        ...bucket,
        elevationM: Math.round(bucket.elevationM),
        distanceKm: Math.round(bucket.distanceKm * 10) / 10,
        load: Math.round(bucket.load),
        workKj: Math.round(bucket.workKj),
        hours: Math.round((bucket.movingTimeSec / 3600) * 10) / 10,
        avgHr,
        maxHr: bucket.maxHr || 0,
        normPower,
        avgPower,
        avgSpeed,
        rpe,
        maxDistanceKm: Math.round(bucket.maxDistanceKm * 10) / 10,
        maxLoad: Math.round(bucket.maxLoad),
        maxNormPower: bucket.maxNormPower || 0,
        maxAvgPower: bucket.maxAvgPower || 0,
        maxAvgSpeed: bucket.maxAvgSpeed || 0,
        maxRpe: bucket.maxRpe || 0,
        efficiencyFactor,
        intensityFactor,
        maxIntensityFactor: bucket.maxIntensityFactor || 0,
        decouplingPct,
        thresholdDriftPct,
        raceDriftPct,
        maxDecouplingPct: bucket.maxDecouplingPct || 0,
        maxThresholdDriftPct: bucket.maxThresholdDriftPct || 0,
        maxRaceDriftPct: bucket.maxRaceDriftPct || 0,
        decouplingPctCount: bucket.decouplingPctCount,
        thresholdDriftPctCount: bucket.thresholdDriftPctCount,
        raceDriftPctCount: bucket.raceDriftPctCount,
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
 * @param {number} [profileFtp]
 */
export function buildPlaygroundBuckets(activities, cadence, profileFtp = 0) {
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
        addActivityToBucket(map.get(key), a, profileFtp);
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
 * @param {{ topN?: number }} [options]
 */
export function bucketMetricValue(bucket, metricId, statMode = 'primary', options = {}) {
    const topN = options.topN ?? 10;

    const peakMatch = metricId.match(/^(best_\w+min)_(avg|max|topN)$/);
    if (peakMatch) {
        const [, field, agg] = peakMatch;
        const values = bucket.powerPeaks?.[field] || [];
        return peakAgg(values, agg === 'topN' ? 'topN' : agg, topN);
    }

    if (statMode === 'max') {
        switch (metricId) {
            case 'distanceKm': return bucket.maxDistanceKm;
            case 'load': return bucket.maxLoad;
            case 'maxHr': return bucket.maxHr;
            case 'normPower': return bucket.maxNormPower;
            case 'intensityFactor': return bucket.maxIntensityFactor || null;
            case 'avgPower': return bucket.maxAvgPower;
            case 'avgSpeed': return bucket.maxAvgSpeed;
            case 'rpe': return bucket.maxRpe;
            case 'decouplingPct': return bucket.maxDecouplingPct || null;
            case 'thresholdDriftPct': return bucket.maxThresholdDriftPct || null;
            case 'raceDriftPct': return bucket.maxRaceDriftPct || null;
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
        case 'normPower': return bucket.normPower;
        case 'intensityFactor': return bucket.ifWeightSec > 0 ? bucket.intensityFactor : null;
        case 'avgPower': return bucket.avgPower;
        case 'avgSpeed': return bucket.avgSpeed;
        case 'rpe': return bucket.rpe;
        case 'efficiencyFactor': return bucket.efficiencyFactor || null;
        case 'decouplingPct': return bucket.decouplingPctCount > 0 ? bucket.decouplingPct : null;
        case 'thresholdDriftPct': return bucket.thresholdDriftPctCount > 0 ? bucket.thresholdDriftPct : null;
        case 'raceDriftPct': return bucket.raceDriftPctCount > 0 ? bucket.raceDriftPct : null;
        default: return bucket.distanceKm;
    }
}
