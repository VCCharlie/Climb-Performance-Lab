/**
 * Strava-style volume goals: weekly / monthly / yearly targets for
 * distance (km), moving time (hours), and elevation (m).
 * Progress is summed from activities in the current calendar period (local time).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);

/** @typedef {{ distanceKm: number, movingTimeHours: number, elevationM: number }} VolumeGoalTriple */
/** @typedef {{ weekly: VolumeGoalTriple, monthly: VolumeGoalTriple, yearly: VolumeGoalTriple }} VolumeGoalsShape */

/** @returns {VolumeGoalsShape} */
export function defaultVolumeGoals() {
    return {
        weekly: { distanceKm: 0, movingTimeHours: 0, elevationM: 0 },
        monthly: { distanceKm: 0, movingTimeHours: 0, elevationM: 0 },
        yearly: { distanceKm: 0, movingTimeHours: 0, elevationM: 0 },
    };
}

/** @param {unknown} v @returns {VolumeGoalsShape} */
export function mergeVolumeGoals(v) {
    const d = defaultVolumeGoals();
    if (!v || typeof v !== 'object') return d;
    for (const key of ['weekly', 'monthly', 'yearly']) {
        const src = v[key];
        if (!src || typeof src !== 'object') continue;
        d[key] = {
            distanceKm: Math.max(0, Number(src.distanceKm) || 0),
            movingTimeHours: Math.max(0, Number(src.movingTimeHours) || 0),
            elevationM: Math.max(0, Number(src.elevationM) || 0),
        };
    }
    return d;
}

/**
 * @param {string | undefined} type
 */
function isTrackedActivity(type) {
    if (!type) return false;
    return TRACKED_SPORTS.has(type);
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** @param {Date} d */
function toYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Monday–Sunday (ISO-style week, Monday start) containing `ref`.
 * @param {Date} ref
 * @returns {{ startYmd: string, endYmd: string, label: string }}
 */
export function currentWeekRange(ref = new Date()) {
    const local = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dow = local.getDay(); // 0 Sun … 6 Sat
    const offsetToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(local);
    monday.setDate(local.getDate() + offsetToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startYmd = toYmd(monday);
    const endYmd = toYmd(sunday);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`;
    return { startYmd, endYmd, label };
}

/**
 * @param {Date} ref
 * @returns {{ startYmd: string, endYmd: string, label: string }}
 */
export function currentMonthRange(ref = new Date()) {
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const startYmd = `${y}-${pad2(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endYmd = `${y}-${pad2(m + 1)}-${pad2(lastDay)}`;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const label = `${months[m]} ${y}`;
    return { startYmd, endYmd, label };
}

/**
 * @param {Date} ref
 * @returns {{ startYmd: string, endYmd: string, label: string }}
 */
export function currentYearRange(ref = new Date()) {
    const y = ref.getFullYear();
    return {
        startYmd: `${y}-01-01`,
        endYmd: `${y}-12-31`,
        label: String(y),
    };
}

/**
 * @param {object[]} activities
 * @param {string} startYmd
 * @param {string} endYmd
 */
export function sumVolumeForRange(activities, startYmd, endYmd) {
    let distanceKm = 0;
    let movingTimeSec = 0;
    let elevationM = 0;

    for (const a of activities || []) {
        if (!isTrackedActivity(a.type)) continue;
        const dStr = normalizeDate(a.date);
        if (!dStr || dStr.length < 10) continue;
        const day = dStr.slice(0, 10);
        if (day < startYmd || day > endYmd) continue;

        const km = activityDistanceKm(a);
        if (km != null) distanceKm += km;

        const sec = activityMovingTimeSec(a);
        if (sec != null) movingTimeSec += sec;

        elevationM += Number(a.climbing) || 0;
    }

    return { distanceKm, movingTimeSec, elevationM };
}

/**
 * @param {number} current
 * @param {number} target
 * @returns {number} 0–100
 */
export function progressPercent(current, target) {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 1000) / 10);
}
