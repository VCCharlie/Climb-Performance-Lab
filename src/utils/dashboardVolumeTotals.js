/**
 * Weekly / monthly volume totals for Dashboard (Strava-style summaries).
 * Buckets use local calendar; weeks start on Monday.
 */

import { normalizeDate, formatDateDDMMYYYY } from './formatters';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics';

function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * @param {string} ymd - YYYY-MM-DD
 * @returns {Date | null}
 */
function parseYmdLocal(ymd) {
    if (!ymd || typeof ymd !== 'string' || ymd.length < 10) return null;
    const [y, m, d] = ymd.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Monday (local) of the calendar week containing the given YYYY-MM-DD.
 * @param {string} ymd
 * @returns {string | null} YYYY-MM-DD of Monday
 */
export function ymdToMondayYmd(ymd) {
    const dt = parseYmdLocal(ymd);
    if (!dt) return null;
    const dow = dt.getDay(); // 0 Sun .. 6 Sat
    const offset = dow === 0 ? -6 : 1 - dow;
    dt.setDate(dt.getDate() + offset);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/**
 * @param {string} ymd
 * @param {number} deltaDays
 * @returns {string | null}
 */
export function addDaysToYmd(ymd, deltaDays) {
    const dt = parseYmdLocal(ymd);
    if (!dt) return null;
    dt.setDate(dt.getDate() + deltaDays);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDurationHoursMinutes(totalSeconds) {
    const s = Math.floor(Number(totalSeconds) || 0);
    if (s <= 0) return '0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

/**
 * @param {string} mondayYmd
 * @param {string} sundayYmd
 */
export function formatWeekRangeLabelEn(mondayYmd, sundayYmd) {
    const a = formatDateDDMMYYYY(mondayYmd);
    const b = formatDateDDMMYYYY(sundayYmd);
    if (a === '-' || b === '-') return mondayYmd || '—';
    return `${a} – ${b}`;
}

/**
 * @param {string} monthKey - YYYY-MM
 */
export function formatMonthLabelEn(monthKey) {
    if (!monthKey || monthKey.length < 7) return '—';
    const y = Number(monthKey.slice(0, 4));
    const mo = Number(monthKey.slice(5, 7));
    if (!Number.isFinite(y) || !Number.isFinite(mo)) return monthKey;
    const monthName = new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
    return `${monthName} ${y}`;
}

/**
 * @param {string} yearKey - YYYY
 */
export function formatYearLabelEn(yearKey) {
    if (!yearKey || yearKey.length < 4) return '—';
    const y = Number(yearKey.slice(0, 4));
    return Number.isFinite(y) ? String(y) : yearKey;
}

function emptyBucket() {
    return {
        rideCount: 0,
        distanceKm: 0,
        elevationM: 0,
        movingTimeSec: 0,
        load: 0,
    };
}

function addActivityToBucket(bucket, a) {
    bucket.rideCount += 1;
    const dk = activityDistanceKm(a);
    if (dk != null && !Number.isNaN(dk)) bucket.distanceKm += dk;
    const el = Number(a?.climbing);
    if (!Number.isNaN(el) && el > 0) bucket.elevationM += el;
    const mt = activityMovingTimeSec(a);
    if (mt != null && !Number.isNaN(mt) && mt > 0) bucket.movingTimeSec += mt;
    const ld = Number(a?.load);
    if (!Number.isNaN(ld) && ld > 0) bucket.load += ld;
}

/**
 * @param {object[]} activities
 * @returns {{ key: string, label: string, rideCount: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }[]}
 */
export function buildMonthlyVolumeTotals(activities) {
    const map = new Map();
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 7) continue;
        const monthKey = ymd.slice(0, 7);
        if (!map.has(monthKey)) map.set(monthKey, emptyBucket());
        addActivityToBucket(map.get(monthKey), a);
    }
    return [...map.entries()]
        .map(([key, b]) => ({
            key,
            label: formatMonthLabelEn(key),
            ...b,
            elevationM: Math.round(b.elevationM),
            distanceKm: Math.round(b.distanceKm * 10) / 10,
            load: Math.round(b.load),
        }))
        .sort((x, y) => y.key.localeCompare(x.key));
}

/**
 * @param {object[]} activities
 * @returns {{ key: string, label: string, rideCount: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }[]}
 */
/**
 * @param {object[]} activities
 * @returns {{ key: string, label: string, rideCount: number, distanceKm: number, elevationM: number, movingTimeSec: number, load: number }[]}
 */
export function buildYearlyVolumeTotals(activities) {
    const map = new Map();
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        if (!ymd || ymd.length < 4) continue;
        const yearKey = ymd.slice(0, 4);
        if (!map.has(yearKey)) map.set(yearKey, emptyBucket());
        addActivityToBucket(map.get(yearKey), a);
    }
    return [...map.entries()]
        .map(([key, b]) => ({
            key,
            label: formatYearLabelEn(key),
            ...b,
            elevationM: Math.round(b.elevationM),
            distanceKm: Math.round(b.distanceKm * 10) / 10,
            load: Math.round(b.load),
        }))
        .sort((x, y) => y.key.localeCompare(x.key));
}

export function buildWeeklyVolumeTotals(activities) {
    const map = new Map();
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        const mon = ymdToMondayYmd(ymd);
        if (!mon) continue;
        if (!map.has(mon)) map.set(mon, emptyBucket());
        addActivityToBucket(map.get(mon), a);
    }
    return [...map.entries()]
        .map(([key, b]) => {
            const sun = addDaysToYmd(key, 6);
            return {
                key,
                label: sun ? formatWeekRangeLabelEn(key, sun) : key,
                ...b,
                elevationM: Math.round(b.elevationM),
                distanceKm: Math.round(b.distanceKm * 10) / 10,
                load: Math.round(b.load),
            };
        })
        .sort((x, y) => y.key.localeCompare(x.key));
}

/**
 * Oldest → newest (for time-series charts).
 * @template {{ key: string }} T
 * @param {T[]} rows
 * @returns {T[]}
 */
export function orderVolumeRowsChronological(rows) {
    return [...(rows || [])].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * X-axis tick for a week bucket (key = Monday YYYY-MM-DD).
 * @param {string} mondayYmd
 */
export function formatWeekChartTickEn(mondayYmd) {
    const label = formatDateDDMMYYYY(mondayYmd);
    return label === '-' ? (mondayYmd || '') : label;
}

/**
 * Compact month label for chart axis (YYYY-MM).
 * @param {string} monthKey
 */
export function formatMonthChartTickEn(monthKey) {
    if (!monthKey || monthKey.length < 7) return monthKey || '';
    const label = formatDateDDMMYYYY(`${monthKey}-01`);
    return label === '-' ? monthKey : label;
}

/**
 * X-axis tick for a year bucket (key = YYYY).
 * @param {string} yearKey
 */
export function formatYearChartTickEn(yearKey) {
    return formatYearLabelEn(yearKey);
}

/**
 * Trailing moving average (same length as input). Used for trend overlay on volume charts.
 * @param {number[]} values
 * @param {number} window - max periods to include (>= 1)
 * @returns {number[]}
 */
export function trailingMovingAverage(values, window) {
    const w = Math.max(1, Math.floor(Number(window)) || 1);
    const arr = values || [];
    const out = [];
    for (let i = 0; i < arr.length; i += 1) {
        const start = Math.max(0, i - w + 1);
        const slice = arr.slice(start, i + 1);
        const sum = slice.reduce((a, b) => a + (Number(b) || 0), 0);
        out.push(sum / slice.length);
    }
    return out;
}

/**
 * First and last calendar day for a month bucket key (YYYY-MM).
 * @param {string} monthKey
 * @returns {{ startYmd: string, endYmd: string } | null}
 */
export function monthKeyToDateRange(monthKey) {
    if (!monthKey || monthKey.length < 7) return null;
    const y = Number(monthKey.slice(0, 4));
    const mo = Number(monthKey.slice(5, 7));
    if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
    const startYmd = `${y}-${pad2(mo)}-01`;
    const last = new Date(y, mo, 0);
    const endYmd = `${y}-${pad2(mo)}-${pad2(last.getDate())}`;
    return { startYmd, endYmd };
}

/**
 * Monday YMD one calendar year earlier (re-aligned to Monday).
 * @param {string} mondayYmd
 */
export function mondayOneYearBefore(mondayYmd) {
    const dt = parseYmdLocal(mondayYmd);
    if (!dt) return null;
    dt.setFullYear(dt.getFullYear() - 1);
    const ymd = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    return ymdToMondayYmd(ymd);
}

/**
 * @param {string} monthKey - YYYY-MM
 */
export function monthKeyOneYearBefore(monthKey) {
    if (!monthKey || monthKey.length < 7) return null;
    const y = Number(monthKey.slice(0, 4)) - 1;
    const mo = monthKey.slice(5, 7);
    if (!Number.isFinite(y)) return null;
    return `${y}-${mo}`;
}

/**
 * @param {string} yearKey - YYYY
 * @returns {{ startYmd: string, endYmd: string } | null}
 */
export function yearKeyToDateRange(yearKey) {
    if (!yearKey || yearKey.length < 4) return null;
    const y = Number(yearKey.slice(0, 4));
    if (!Number.isFinite(y)) return null;
    return { startYmd: `${y}-01-01`, endYmd: `${y}-12-31` };
}

/**
 * @param {string} yearKey - YYYY
 */
export function yearKeyOneYearBefore(yearKey) {
    if (!yearKey || yearKey.length < 4) return null;
    const y = Number(yearKey.slice(0, 4)) - 1;
    return Number.isFinite(y) ? String(y) : null;
}
