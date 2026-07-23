/**
 * Year-over-year YTD comparison for CPL activity log (canonical shape).
 * Same calendar window as Strava Year Review: Jan 1 → reference date (inclusive).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';
import { percentChange } from './stravaYtdCompare.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);

/**
 * @typedef {{ count: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }} YtdTotals
 */

/**
 * @param {Date} referenceDate
 * @returns {{ startThis: string, endThis: string, startPrev: string, endPrev: string }}
 */
export function ytdComparisonWindows(referenceDate) {
    const y = referenceDate.getFullYear();
    const mo = referenceDate.getMonth();
    const da = referenceDate.getDate();
    const pad = (n) => String(n).padStart(2, '0');

    return {
        startThis: `${y}-01-01`,
        endThis: `${y}-${pad(mo + 1)}-${pad(da)}`,
        startPrev: `${y - 1}-01-01`,
        endPrev: `${y - 1}-${pad(mo + 1)}-${pad(da)}`,
    };
}

function isTrackedActivity(type) {
    return type && TRACKED_SPORTS.has(type);
}

function inRange(dayYmd, startYmd, endYmd) {
    return dayYmd >= startYmd && dayYmd <= endYmd;
}

/** @returns {YtdTotals} */
function emptyTotals() {
    return {
        count: 0,
        distanceKm: 0,
        elevationM: 0,
        movingTimeSec: 0,
        load: 0,
    };
}

/**
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @returns {{ thisYtd: YtdTotals, prevYtd: YtdTotals, referenceDate: string } | null}
 */
export function computeCplYtdYearOverYear(activities, referenceDate = new Date()) {
    if (!activities?.length || !referenceDate || Number.isNaN(referenceDate.getTime())) {
        return null;
    }

    const { startThis, endThis, startPrev, endPrev } = ytdComparisonWindows(referenceDate);
    const thisYtd = emptyTotals();
    const prevYtd = emptyTotals();

    for (const a of activities) {
        if (!isTrackedActivity(a?.type)) continue;
        const day = normalizeDate(a.date);
        if (!day || day.length < 10) continue;
        const ymd = day.slice(0, 10);

        let bucket = null;
        if (inRange(ymd, startThis, endThis)) bucket = thisYtd;
        else if (inRange(ymd, startPrev, endPrev)) bucket = prevYtd;
        else continue;

        bucket.count += 1;
        const km = activityDistanceKm(a);
        if (km != null) bucket.distanceKm += km;
        bucket.elevationM += Number(a.climbing) || 0;
        const sec = activityMovingTimeSec(a);
        if (sec != null) bucket.movingTimeSec += sec;
        bucket.load += Number(a.load) || 0;
    }

    return {
        thisYtd,
        prevYtd,
        referenceDate: referenceDate.toISOString(),
    };
}

export { percentChange };
