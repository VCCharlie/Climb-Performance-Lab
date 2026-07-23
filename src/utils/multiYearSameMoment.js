/**
 * Multi-year totals at the same calendar moment (Compare tab).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';
import { comparePeriodWindowForYear } from './comparePeriodWindows.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);
const DEFAULT_MAX_YEARS = 5;
const MAX_COMPARE_YEARS_CAP = 20;

/**
 * How many year rows to show — from oldest activity year through reference year (capped).
 * @param {object[]} activities
 * @param {Date} [referenceDate]
 * @param {number} [cap]
 */
export function inferCompareYearCount(activities, referenceDate = new Date(), cap = MAX_COMPARE_YEARS_CAP) {
    const refYear = referenceDate.getFullYear();
    let minYear = refYear;

    for (const a of activities || []) {
        const day = normalizeDate(a.date);
        if (!day || day.length < 10) continue;
        const y = parseInt(day.slice(0, 10), 10);
        if (!Number.isNaN(y)) minYear = Math.min(minYear, y);
    }

    const span = refYear - minYear + 1;
    return Math.min(Math.max(span, 1), cap);
}

/**
 * @param {object[]} activities
 * @param {Set<string> | null} sportTypes - when empty/null, all tracked sports count
 */
export function filterActivitiesBySportTypes(activities, sportTypes) {
    const useAll = !sportTypes || sportTypes.size === 0;
    return (activities || []).filter((a) => {
        if (!a?.type) return false;
        if (useAll) return TRACKED_SPORTS.has(a.type);
        return sportTypes.has(a.type);
    });
}

function emptyRow(year) {
    return {
        year,
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
 * @param {number} [maxYears]
 * @param {Set<string> | null} [sportTypes]
 * @param {import('./comparePeriodWindows.js').ComparePeriodId} [period]
 * @returns {Array<{ year: number, count: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }>}
 */
export function computeMultiYearCompareRows(
    activities,
    referenceDate = new Date(),
    maxYears = DEFAULT_MAX_YEARS,
    sportTypes = null,
    period = 'ytd',
) {
    const filtered = filterActivitiesBySportTypes(activities, sportTypes);
    if (!filtered.length || !referenceDate || Number.isNaN(referenceDate.getTime())) {
        return [];
    }

    const refYear = referenceDate.getFullYear();
    const years = [];
    for (let i = 0; i < maxYears; i += 1) {
        years.push(refYear - i);
    }

    const byYear = new Map(years.map((y) => [y, emptyRow(y)]));

    const windows = new Map();
    for (const y of years) {
        const win = comparePeriodWindowForYear(period, referenceDate, y);
        windows.set(y, win);
    }

    for (const a of filtered) {
        const day = normalizeDate(a.date);
        if (!day || day.length < 10) continue;
        const ymd = day.slice(0, 10);

        for (const y of years) {
            const win = windows.get(y);
            if (!win || ymd < win.startYmd || ymd > win.endYmd) continue;

            const row = byYear.get(y);
            if (!row) continue;

            row.count += 1;
            const km = activityDistanceKm(a);
            if (km != null) row.distanceKm += km;
            row.elevationM += Number(a.climbing) || 0;
            const sec = activityMovingTimeSec(a);
            if (sec != null) row.movingTimeSec += sec;
            row.load += Number(a.load) || 0;
            break;
        }
    }

    return years
        .map((y) => byYear.get(y))
        .filter((row) => row.count > 0 || row.distanceKm > 0 || row.elevationM > 0);
}

/** @deprecated use computeMultiYearCompareRows */
export function computeMultiYearYtdAtSameMoment(activities, referenceDate, maxYears, sportTypes) {
    return computeMultiYearCompareRows(activities, referenceDate, maxYears, sportTypes, 'ytd');
}

/**
 * @param {ReturnType<typeof computeMultiYearCompareRows>} rows
 * @param {'distanceKm' | 'elevationM' | 'movingTimeSec' | 'load'} metric
 */
export function multiYearChartSeries(rows, metric) {
    return (rows || []).map((r) => ({
        year: String(r.year),
        value: metric === 'movingTimeSec' ? r.movingTimeSec / 3600 : r[metric],
        count: r.count,
    }));
}
