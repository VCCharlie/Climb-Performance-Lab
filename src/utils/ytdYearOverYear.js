/**
 * Year-over-year YTD comparison for CPL activity log (canonical shape).
 * Same calendar window as Strava Year Review: Jan 1 → reference date (inclusive).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';
import { percentChange } from './stravaYtdCompare.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);

/** Road cycling YTD split (outdoor + indoor road). */
export const YTD_ROAD_ACTIVITY_TYPES = new Set(['Ride', 'VirtualRide']);
/** Gravel YTD split. */
export const YTD_GRAVEL_ACTIVITY_TYPES = new Set(['GravelRide']);

/**
 * @param {string | undefined} type
 * @returns {'road' | 'gravel' | null}
 */
export function ytdSurfaceBucketForType(type) {
    if (YTD_GRAVEL_ACTIVITY_TYPES.has(type)) return 'gravel';
    if (YTD_ROAD_ACTIVITY_TYPES.has(type)) return 'road';
    return null;
}

/**
 * @typedef {{ count: number, distanceKm: number, movingTimeSec: number }} YtdSurfaceTotals
 */

/** @returns {YtdSurfaceTotals} */
function emptySurfaceTotals() {
    return { count: 0, distanceKm: 0, movingTimeSec: 0 };
}

/** @returns {{ road: YtdSurfaceTotals, gravel: YtdSurfaceTotals }} */
function emptySurfacePair() {
    return { road: emptySurfaceTotals(), gravel: emptySurfaceTotals() };
}

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

/**
 * YTD volume split: road (Ride + VirtualRide) vs gravel (GravelRide).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @returns {{ thisYtd: { road: YtdSurfaceTotals, gravel: YtdSurfaceTotals }, prevYtd: { road: YtdSurfaceTotals, gravel: YtdSurfaceTotals }, referenceDate: string } | null}
 */
export function computeYtdGravelVsRoad(activities, referenceDate = new Date()) {
    if (!activities?.length || !referenceDate || Number.isNaN(referenceDate.getTime())) {
        return null;
    }

    const { startThis, endThis, startPrev, endPrev } = ytdComparisonWindows(referenceDate);
    const thisYtd = emptySurfacePair();
    const prevYtd = emptySurfacePair();

    for (const a of activities) {
        const surface = ytdSurfaceBucketForType(a?.type);
        if (!surface) continue;
        const day = normalizeDate(a.date);
        if (!day || day.length < 10) continue;
        const ymd = day.slice(0, 10);

        let period = null;
        if (inRange(ymd, startThis, endThis)) period = thisYtd;
        else if (inRange(ymd, startPrev, endPrev)) period = prevYtd;
        else continue;

        const bucket = period[surface];
        bucket.count += 1;
        const km = activityDistanceKm(a);
        if (km != null) bucket.distanceKm += km;
        const sec = activityMovingTimeSec(a);
        if (sec != null) bucket.movingTimeSec += sec;
    }

    return {
        thisYtd,
        prevYtd,
        referenceDate: referenceDate.toISOString(),
    };
}

export { percentChange };
