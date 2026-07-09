/**
 * Symmetrische datumvensters voor Dashboard (o.a. vergelijking vorige periode).
 * Eindigt op referenceEndDate (EOD); start = zelfde rolling/cutoff als site-preset.
 */

import { normalizeDate } from './formatters';
import {
    activityDistanceKm,
    activityAvgSpeedKmh,
    activityMovingTimeSec,
} from './activityFilterMetrics';

function toLocalYmd(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    const m = `${x.getMonth() + 1}`.padStart(2, '0');
    const day = `${x.getDate()}`.padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
}

/**
 * YMD bounds for the Dashboard time-range preset (string comparison, no per-row Date allocation).
 * @returns {{ mode: 'range', startYmd: string, endYmd: string } | { mode: 'since', startYmd: string } | null}
 *   null = custom range with no start → include all activities
 */
export function getDashboardFilterBoundsYmd(timeRange, customStart, customEnd) {
    if (timeRange === 'Custom') {
        if (!customStart) return null;
        const startYmd = normalizeDate(customStart);
        let endYmd;
        if (customEnd) {
            endYmd = normalizeDate(customEnd);
        } else {
            endYmd = toLocalYmd(new Date());
        }
        return { mode: 'range', startYmd, endYmd };
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);

    if (timeRange === '1M') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    else if (timeRange === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    else if (timeRange === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    else if (timeRange === '1Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    else if (timeRange === '3Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    else if (timeRange === '6Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 6);
    else if (timeRange === 'ALL') return { mode: 'since', startYmd: '2000-01-01' };
    else cutoffDate.setMonth(cutoffDate.getMonth() - 12);

    return { mode: 'since', startYmd: toLocalYmd(cutoffDate) };
}

/**
 * Filter raw activities to the Dashboard time-range before expensive enrich passes.
 */
export function filterActivitiesByDashboardTimeRange(activities, timeRange, customStart, customEnd) {
    const list = activities || [];
    if (!list.length) return [];

    const bounds = getDashboardFilterBoundsYmd(timeRange, customStart, customEnd);
    if (!bounds) return list;

    return list.filter((a) => {
        if (!a?.date) return false;
        const dStr = normalizeDate(a.date);
        if (!dStr || dStr.length < 10) return false;
        if (bounds.mode === 'range') {
            return dStr >= bounds.startYmd && dStr <= bounds.endYmd;
        }
        return dStr >= bounds.startYmd;
    });
}

/**
 * @returns {{ start: Date, end: Date } | null}
 */
export function getDashboardWindowBounds(timeRange, customStart, customEnd, referenceEndDate) {
    const end = referenceEndDate ? new Date(referenceEndDate) : new Date();
    end.setHours(23, 59, 59, 999);

    if (timeRange === 'Custom') {
        if (!customStart) {
            const startAll = new Date('2000-01-01');
            startAll.setHours(0, 0, 0, 0);
            return { start: startAll, end };
        }
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        const endCustom = customEnd ? new Date(customEnd) : new Date();
        endCustom.setHours(23, 59, 59, 999);
        return { start, end: endCustom };
    }

    const start = new Date(end);
    start.setHours(0, 0, 0, 0);

    if (timeRange === '1M') start.setMonth(start.getMonth() - 1);
    else if (timeRange === '3M') start.setMonth(start.getMonth() - 3);
    else if (timeRange === '6M') start.setMonth(start.getMonth() - 6);
    else if (timeRange === '1Y') start.setFullYear(start.getFullYear() - 1);
    else if (timeRange === '3Y') start.setFullYear(start.getFullYear() - 3);
    else if (timeRange === '6Y') start.setFullYear(start.getFullYear() - 6);
    else if (timeRange === 'ALL') start.setTime(new Date('2000-01-01').getTime());
    else start.setMonth(start.getMonth() - 12);

    return { start, end };
}

export function filterActivitiesInBounds(activities, bounds) {
    if (!bounds || !activities?.length) return [];
    return activities.filter((a) => {
        const d = new Date(a.date);
        return !Number.isNaN(d.getTime()) && d >= bounds.start && d <= bounds.end;
    });
}

/**
 * Zelfde lengte als huidig venster, direct ervoor (eindigt net voor bounds.start).
 */
export function previousWindowBounds(bounds) {
    if (!bounds) return null;
    const len = bounds.end.getTime() - bounds.start.getTime();
    if (len <= 0) return null;
    const prevEnd = new Date(bounds.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - len);
    return { start: prevStart, end: prevEnd };
}

/**
 * N dagen direct vóór bounds.start (start 00:00, eind dag ervoor EOD — compacte kalenderdagen).
 */
export function compareDaysBeforeWindow(bounds, days) {
    if (!bounds || days == null || days <= 0) return null;
    const prevEnd = new Date(bounds.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));
    prevStart.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
}

/**
 * @param {string} startYmd - YYYY-MM-DD
 * @param {string} endYmd - YYYY-MM-DD
 * @returns {{ start: Date, end: Date } | null}
 */
export function boundsFromYmdRange(startYmd, endYmd) {
    if (!startYmd || !endYmd) return null;
    const start = new Date(`${startYmd}T00:00:00`);
    const end = new Date(`${endYmd}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
    return { start, end };
}

/**
 * Volledig kalenderjaar (lokaal).
 */
export function calendarYearBounds(year) {
    const y = Number(year);
    if (!Number.isFinite(y) || y < 1970 || y > 2100) return null;
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y, 11, 31, 23, 59, 59, 999);
    return { start, end };
}

function toYmd(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    const m = `${x.getMonth() + 1}`.padStart(2, '0');
    const day = `${x.getDate()}`.padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
}

/**
 * Voor date input defaults.
 */
export function boundsToYmdPair(bounds) {
    if (!bounds) return { startYmd: '', endYmd: '' };
    return { startYmd: toYmd(bounds.start), endYmd: toYmd(bounds.end) };
}

/**
 * Totaal ritten, km en hoogtemeters in een gefilterde activiteitenlijst.
 */
export function aggregatePeriodStats(activities) {
    const list = activities || [];
    let distanceKm = 0;
    let elevationM = 0;
    let speedSum = 0;
    let speedCount = 0;
    for (const a of list) {
        const dk = activityDistanceKm(a);
        if (dk != null && !Number.isNaN(dk)) distanceKm += dk;
        const el = Number(a?.climbing);
        if (!Number.isNaN(el) && el > 0) elevationM += el;
        const timeSec = activityMovingTimeSec(a);
        const spd = activityAvgSpeedKmh(a, dk, timeSec);
        if (spd != null && !Number.isNaN(spd)) {
            speedSum += spd;
            speedCount += 1;
        }
    }
    const rideCount = list.length;
    return {
        rideCount,
        distanceKm,
        elevationM: Math.round(elevationM),
        avgDistanceKm: rideCount > 0 ? distanceKm / rideCount : null,
        avgSpeedKmh: speedCount > 0 ? speedSum / speedCount : null,
    };
}

/**
 * Top N rides by stored distance (km), for dashboard "longest rides" tables.
 * @param {object[]} activities
 * @param {number} n
 * @returns {{ activity: object, km: number }[]}
 */
export function topNLongestRidesByDistanceKm(activities, n = 10) {
    const cap = Math.max(1, Math.min(50, Number(n) || 10));
    const rows = [];
    for (const a of activities || []) {
        const km = activityDistanceKm(a);
        if (km == null || Number.isNaN(km) || km <= 0) continue;
        rows.push({ activity: a, km });
    }
    rows.sort((x, y) => y.km - x.km);
    return rows.slice(0, cap);
}

/**
 * Totals and averages for the rides listed in the longest-rides table only (same rows as topNLongestRidesByDistanceKm).
 * @param {{ activity: object, km: number }[]} rows
 */
export function aggregateStatsFromLongestRideRows(rows) {
    // ⚡ Bolt Optimization: Use single-pass reduce instead of chained map/filter
    const activities = (rows || []).reduce((acc, r) => {
        if (r?.activity) acc.push(r.activity);
        return acc;
    }, []);
    return aggregatePeriodStats(activities);
}
