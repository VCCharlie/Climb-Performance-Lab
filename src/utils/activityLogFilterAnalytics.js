/**
 * Aggregated metrics for the Activity Log filter analytics bar.
 */

import { normalizeDate, formatNlNumber } from './formatters';
import {
    activityDistanceKm,
    activityMovingTimeSec,
    activityAvgSpeedKmh,
    activityIntensityFactor,
} from './activityFilterMetrics';

/**
 * @param {number} totalSec
 * @returns {string}
 */
export function formatTotalMovingTime(totalSec) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    if (sec <= 0) return '0h';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h <= 0) return `${m}m`;
    if (m <= 0) return `${h}h`;
    return `${h}h ${m}m`;
}

/**
 * @param {number | null | undefined} part
 * @param {number | null | undefined} whole
 * @returns {number | null}
 */
export function percentOf(part, whole) {
    const p = Number(part);
    const w = Number(whole);
    if (!Number.isFinite(p) || !Number.isFinite(w) || w <= 0) return null;
    return Math.round((p / w) * 1000) / 10;
}

/**
 * @param {object} activity
 * @param {number} profileFtp
 * @returns {{ sec: number, km: number, elev: number, load: number, np: number, hr: number, speed: number }}
 */
function accumulateActivityMetrics(activity, profileFtp) {
    const km = activityDistanceKm(activity);
    const sec = activityMovingTimeSec(activity) || 0;
    const elev = Number(activity?.climbing);
    const load = Number(activity?.load);
    const np = Number(activity?.norm_power) || Number(activity?.avg_power) || 0;
    const ap = Number(activity?.avg_power) || 0;
    const hr = Number(activity?.avg_hr) || 0;
    const speed = activityAvgSpeedKmh(activity, km, sec > 0 ? sec : null);

    return {
        sec: sec > 0 ? sec : 0,
        km: km != null && !Number.isNaN(km) ? km : 0,
        elev: !Number.isNaN(elev) && elev > 0 ? elev : 0,
        load: !Number.isNaN(load) && load > 0 ? load : 0,
        np: np > 0 ? np : 0,
        ap: ap > 0 ? ap : 0,
        hr: hr > 0 ? hr : 0,
        speed: speed != null && !Number.isNaN(speed) ? speed : 0,
        ifVal: activityIntensityFactor(np, profileFtp),
    };
}

/**
 * @param {object[]} activities
 * @param {number} profileFtp
 * @returns {{
 *   rideCount: number,
 *   movingTimeSec: number,
 *   distanceKm: number,
 *   elevationM: number,
 *   loadSum: number,
 *   npSum: number,
 *   npCount: number,
 *   hrSum: number,
 *   hrCount: number,
 *   speedSum: number,
 *   speedCount: number,
 *   ifSum: number,
 *   ifCount: number,
 * }}
 */
export function aggregateActivityListMetrics(activities, profileFtp = 0) {
    const out = {
        rideCount: 0,
        movingTimeSec: 0,
        distanceKm: 0,
        elevationM: 0,
        loadSum: 0,
        npSum: 0,
        npCount: 0,
        apSum: 0,
        apCount: 0,
        hrSum: 0,
        hrCount: 0,
        speedSum: 0,
        speedCount: 0,
        ifSum: 0,
        ifCount: 0,
    };

    for (const activity of activities || []) {
        if (!activity) continue;
        const m = accumulateActivityMetrics(activity, profileFtp);
        out.rideCount += 1;
        out.movingTimeSec += m.sec;
        out.distanceKm += m.km;
        out.elevationM += m.elev;
        out.loadSum += m.load;
        if (m.np > 0) {
            out.npSum += m.np;
            out.npCount += 1;
        }
        if (m.ap > 0) {
            out.apSum += m.ap;
            out.apCount += 1;
        }
        if (m.hr > 0) {
            out.hrSum += m.hr;
            out.hrCount += 1;
        }
        if (m.speed > 0) {
            out.speedSum += m.speed;
            out.speedCount += 1;
        }
        if (m.ifVal != null && m.ifVal > 0) {
            out.ifSum += m.ifVal;
            out.ifCount += 1;
        }
    }

    out.elevationM = Math.round(out.elevationM);
    out.distanceKm = Math.round(out.distanceKm * 10) / 10;
    out.loadSum = Math.round(out.loadSum);
    return out;
}

/**
 * @param {object[]} activities
 * @param {number} profileFtp
 * @returns {Array<{ year: string, rideCount: number, distanceKm: number, movingTimeSec: number, elevationM: number, loadSum: number }>}
 */
export function aggregateActivityMetricsByYear(activities, profileFtp = 0) {
    /** @type {Map<string, object>} */
    const byYear = new Map();

    for (const activity of activities || []) {
        const ymd = normalizeDate(activity?.date);
        if (!ymd || ymd.length < 4) continue;
        const year = ymd.slice(0, 4);
        const m = accumulateActivityMetrics(activity, profileFtp);
        const bucket = byYear.get(year) || {
            rideCount: 0,
            distanceKm: 0,
            movingTimeSec: 0,
            elevationM: 0,
            loadSum: 0,
            npSum: 0,
            npCount: 0,
            apSum: 0,
            apCount: 0,
            hrSum: 0,
            hrCount: 0,
            speedSum: 0,
            speedCount: 0,
            ifSum: 0,
            ifCount: 0,
        };
        bucket.rideCount += 1;
        bucket.distanceKm += m.km;
        bucket.movingTimeSec += m.sec;
        bucket.elevationM += m.elev;
        bucket.loadSum += m.load;
        if (m.np > 0) {
            bucket.npSum += m.np;
            bucket.npCount += 1;
        }
        if (m.ap > 0) {
            bucket.apSum += m.ap;
            bucket.apCount += 1;
        }
        if (m.hr > 0) {
            bucket.hrSum += m.hr;
            bucket.hrCount += 1;
        }
        if (m.speed > 0) {
            bucket.speedSum += m.speed;
            bucket.speedCount += 1;
        }
        if (m.ifVal != null && m.ifVal > 0) {
            bucket.ifSum += m.ifVal;
            bucket.ifCount += 1;
        }
        byYear.set(year, bucket);
    }

    return [...byYear.entries()]
        .map(([year, bucket]) => {
            const rideCount = bucket.rideCount;
            return {
                year,
                rideCount,
                distanceKm: Math.round(bucket.distanceKm * 10) / 10,
                movingTimeSec: bucket.movingTimeSec,
                elevationM: Math.round(bucket.elevationM),
                loadSum: Math.round(bucket.loadSum),
                avgDistanceKm: rideCount > 0
                    ? Math.round((bucket.distanceKm / rideCount) * 10) / 10
                    : null,
                avgMovingTimeSec: rideCount > 0
                    ? Math.round(bucket.movingTimeSec / rideCount)
                    : null,
                avgElevationM: rideCount > 0
                    ? Math.round(bucket.elevationM / rideCount)
                    : null,
                avgLoad: rideCount > 0 && bucket.loadSum > 0
                    ? Math.round(bucket.loadSum / rideCount)
                    : null,
                avgNormPower: bucket.npCount > 0
                    ? Math.round(bucket.npSum / bucket.npCount)
                    : null,
                avgPower: bucket.apCount > 0
                    ? Math.round(bucket.apSum / bucket.apCount)
                    : null,
                avgHeartRate: bucket.hrCount > 0
                    ? Math.round(bucket.hrSum / bucket.hrCount)
                    : null,
                avgSpeedKmh: bucket.speedCount > 0
                    ? Math.round((bucket.speedSum / bucket.speedCount) * 10) / 10
                    : null,
                avgIntensityFactor: bucket.ifCount > 0
                    ? Math.round((bucket.ifSum / bucket.ifCount) * 100) / 100
                    : null,
            };
        })
        .sort((a, b) => b.year.localeCompare(a.year));
}

/**
 * @param {object[]} filteredActivities
 * @param {object[]} allActivities
 * @param {number} [profileFtp]
 */
export function computeActivityLogFilterAnalytics(filteredActivities, allActivities, profileFtp = 0) {
    const filtered = aggregateActivityListMetrics(filteredActivities, profileFtp);
    const baseline = aggregateActivityListMetrics(allActivities, profileFtp);

    const avgNormPower = filtered.npCount > 0 ? Math.round(filtered.npSum / filtered.npCount) : null;
    const avgPower = filtered.apCount > 0 ? Math.round(filtered.apSum / filtered.apCount) : null;
    const avgHeartRate = filtered.hrCount > 0 ? Math.round(filtered.hrSum / filtered.hrCount) : null;
    const avgSpeedKmh = filtered.speedCount > 0
        ? Math.round((filtered.speedSum / filtered.speedCount) * 10) / 10
        : null;
    const avgIntensityFactor = filtered.ifCount > 0
        ? Math.round((filtered.ifSum / filtered.ifCount) * 100) / 100
        : null;
    const avgElevationM = filtered.rideCount > 0
        ? Math.round(filtered.elevationM / filtered.rideCount)
        : null;
    const avgDistanceKm = filtered.rideCount > 0
        ? Math.round((filtered.distanceKm / filtered.rideCount) * 10) / 10
        : null;
    const avgMovingTimeSec = filtered.rideCount > 0
        ? Math.round(filtered.movingTimeSec / filtered.rideCount)
        : null;
    const avgLoad = filtered.rideCount > 0 && filtered.loadSum > 0
        ? Math.round(filtered.loadSum / filtered.rideCount)
        : null;

    return {
        rideCount: filtered.rideCount,
        totalRideCount: baseline.rideCount,
        rideCountPct: percentOf(filtered.rideCount, baseline.rideCount),
        distanceKm: filtered.distanceKm,
        distancePctOfAll: percentOf(filtered.distanceKm, baseline.distanceKm),
        avgDistanceKm,
        movingTimeSec: filtered.movingTimeSec,
        movingTimeLabel: formatTotalMovingTime(filtered.movingTimeSec),
        movingTimePctOfAll: percentOf(filtered.movingTimeSec, baseline.movingTimeSec),
        avgMovingTimeSec,
        avgMovingTimeLabel: avgMovingTimeSec ? formatTotalMovingTime(avgMovingTimeSec) : null,
        elevationM: filtered.elevationM,
        elevationPctOfAll: percentOf(filtered.elevationM, baseline.elevationM),
        avgElevationM,
        totalLoad: filtered.loadSum,
        loadPctOfAll: percentOf(filtered.loadSum, baseline.loadSum),
        avgLoad,
        avgNormPower,
        avgPower,
        avgHeartRate,
        avgSpeedKmh,
        avgIntensityFactor,
        byYear: aggregateActivityMetricsByYear(filteredActivities, profileFtp),
        formatted: {
            distanceKm: formatNlNumber(filtered.distanceKm, 1),
            avgDistanceKm: formatNlNumber(avgDistanceKm, 1),
            elevationM: formatNlNumber(filtered.elevationM, 0),
            avgElevationM: formatNlNumber(avgElevationM, 0),
            totalLoad: formatNlNumber(filtered.loadSum, 0),
            avgLoad: formatNlNumber(avgLoad, 0),
        },
    };
}
