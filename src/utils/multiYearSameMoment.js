/**
 * Multi-year YTD totals at the same calendar moment (day-of-year through reference date).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';
import { ytdComparisonWindows } from './ytdYearOverYear.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);
const DEFAULT_MAX_YEARS = 5;

/**
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @param {number} [maxYears]
 * @returns {Array<{ year: number, count: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }>}
 */
export function computeMultiYearYtdAtSameMoment(activities, referenceDate = new Date(), maxYears = DEFAULT_MAX_YEARS) {
    if (!activities?.length || !referenceDate || Number.isNaN(referenceDate.getTime())) {
        return [];
    }

    const refYear = referenceDate.getFullYear();
    const years = [];
    for (let i = 0; i < maxYears; i += 1) {
        years.push(refYear - i);
    }

    const byYear = new Map();
    for (const y of years) {
        byYear.set(y, {
            year: y,
            count: 0,
            distanceKm: 0,
            elevationM: 0,
            movingTimeSec: 0,
            load: 0,
        });
    }

    const windows = new Map();
    for (const y of years) {
        const win = ytdComparisonWindows(new Date(y, referenceDate.getMonth(), referenceDate.getDate()));
        windows.set(y, { start: win.startThis, end: win.endThis });
    }

    for (const a of activities) {
        if (!a?.type || !TRACKED_SPORTS.has(a.type)) continue;
        const day = normalizeDate(a.date);
        if (!day || day.length < 10) continue;
        const ymd = day.slice(0, 10);
        const actYear = parseInt(ymd.slice(0, 4), 10);
        const win = windows.get(actYear);
        if (!win || ymd < win.start || ymd > win.end) continue;

        const row = byYear.get(actYear);
        if (!row) continue;

        row.count += 1;
        const km = activityDistanceKm(a);
        if (km != null) row.distanceKm += km;
        row.elevationM += Number(a.climbing) || 0;
        const sec = activityMovingTimeSec(a);
        if (sec != null) row.movingTimeSec += sec;
        row.load += Number(a.load) || 0;
    }

    return years
        .map((y) => byYear.get(y))
        .filter((row) => row.count > 0 || row.distanceKm > 0 || row.elevationM > 0);
}

/**
 * @param {ReturnType<typeof computeMultiYearYtdAtSameMoment>} rows
 * @param {'distanceKm' | 'elevationM' | 'movingTimeSec' | 'load'} metric
 */
export function multiYearChartSeries(rows, metric) {
    return (rows || []).map((r) => ({
        year: String(r.year),
        value: metric === 'movingTimeSec' ? r.movingTimeSec / 3600 : r[metric],
        count: r.count,
    }));
}
