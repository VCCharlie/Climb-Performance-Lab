/**
 * Strava-style volume goals: weekly / monthly / yearly targets for
 * distance (km), moving time (hours), and elevation (m).
 * Progress is summed from activities in the current calendar period (local time).
 */

import { SPORT_TYPES } from '../config.js';
import { normalizeDate } from './formatters.js';
import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';

const TRACKED_SPORTS = new Set(SPORT_TYPES);

/** Calendar splits used when deriving weekly/monthly targets from yearly settings. */
export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

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
 * Merge cloud + local volume goals without letting empty cloud values wipe local targets.
 * Used after login / Firestore hydration (guards against zero-write races on sign-in).
 * @param {unknown} local
 * @param {unknown} cloud
 */
export function mergeVolumeGoalsPreservingNonZero(local, cloud) {
    const l = mergeVolumeGoals(local);
    const c = mergeVolumeGoals(cloud);
    const out = defaultVolumeGoals();
    for (const key of ['weekly', 'monthly', 'yearly']) {
        out[key] = {
            distanceKm: c[key].distanceKm > 0 ? c[key].distanceKm : l[key].distanceKm,
            movingTimeHours: c[key].movingTimeHours > 0 ? c[key].movingTimeHours : l[key].movingTimeHours,
            elevationM: c[key].elevationM > 0 ? c[key].elevationM : l[key].elevationM,
        };
    }
    return out;
}

function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Yearly volume targets stored in Settings → Performance & Goals.
 * @param {unknown} goals
 * @returns {{ yearlyKm: number, yearlyMovingTimeHours: number, yearlyElevationM: number }}
 */
export function normalizeYearlyVolumeGoals(goals) {
    const g = goals && typeof goals === 'object' ? goals : {};
    return {
        yearlyKm: Math.max(0, Number(g.yearlyKm) || 0),
        yearlyMovingTimeHours: Math.max(0, Number(g.yearlyMovingTimeHours) || 0),
        yearlyElevationM: Math.max(0, Number(g.yearlyElevationM) || 0),
    };
}

/**
 * Copy legacy dashboard `volumeGoals.yearly` into Settings goals when yearly fields are empty.
 * @param {unknown} goals
 * @param {unknown} volumeGoals
 */
export function hydrateYearlyGoalsFromLegacy(goals, volumeGoals) {
    const g = goals && typeof goals === 'object' ? { ...goals } : {};
    const yearly = mergeVolumeGoals(volumeGoals).yearly;

    if (!(Number(g.yearlyKm) > 0) && yearly.distanceKm > 0) {
        g.yearlyKm = yearly.distanceKm;
    }
    if (!(Number(g.yearlyMovingTimeHours) > 0) && yearly.movingTimeHours > 0) {
        g.yearlyMovingTimeHours = yearly.movingTimeHours;
    }
    if (!(Number(g.yearlyElevationM) > 0) && yearly.elevationM > 0) {
        g.yearlyElevationM = yearly.elevationM;
    }
    return g;
}

/**
 * Derive weekly (÷52) and monthly (÷12) targets from yearly settings goals.
 * @param {unknown} goals `userSettings.goals`
 * @returns {VolumeGoalsShape}
 */
export function deriveVolumeGoalsFromYearlyGoals(goals) {
    const y = normalizeYearlyVolumeGoals(goals);
    return {
        weekly: {
            distanceKm: roundTo(y.yearlyKm / WEEKS_PER_YEAR, 1),
            movingTimeHours: roundTo(y.yearlyMovingTimeHours / WEEKS_PER_YEAR, 2),
            elevationM: Math.round(y.yearlyElevationM / WEEKS_PER_YEAR),
        },
        monthly: {
            distanceKm: roundTo(y.yearlyKm / MONTHS_PER_YEAR, 1),
            movingTimeHours: roundTo(y.yearlyMovingTimeHours / MONTHS_PER_YEAR, 2),
            elevationM: Math.round(y.yearlyElevationM / MONTHS_PER_YEAR),
        },
        yearly: {
            distanceKm: y.yearlyKm,
            movingTimeHours: y.yearlyMovingTimeHours,
            elevationM: y.yearlyElevationM,
        },
    };
}

/**
 * Session-only multiplier for dashboard goal preview (settings values stay authoritative).
 * @param {VolumeGoalsShape} goals
 * @param {number} factor 0.5–1.5 typical
 * @returns {VolumeGoalsShape}
 */
export function scaleVolumeGoals(goals, factor) {
    const base = mergeVolumeGoals(goals);
    const f = Number(factor);
    if (!f || f === 1) return base;

    const out = defaultVolumeGoals();
    for (const key of ['weekly', 'monthly', 'yearly']) {
        out[key] = {
            distanceKm: roundTo(base[key].distanceKm * f, 1),
            movingTimeHours: roundTo(base[key].movingTimeHours * f, 2),
            elevationM: Math.round(base[key].elevationM * f),
        };
    }
    return out;
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

/**
 * Fraction of the calendar period [startYmd, endYmd] that has elapsed at `ref` (local clock).
 * Inclusive of the first day from 00:00; exclusive end is midnight after the last day.
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} [ref]
 * @returns {number} 0..1
 */
export function calendarElapsedRatio(range, ref = new Date()) {
    if (!range?.startYmd || !range?.endYmd) return 0;
    const [sy, sm, sd] = range.startYmd.split('-').map((x) => parseInt(x, 10));
    const [ey, em, ed] = range.endYmd.split('-').map((x) => parseInt(x, 10));
    if ([sy, sm, sd, ey, em, ed].some((n) => Number.isNaN(n))) return 0;
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endExclusive = new Date(ey, em - 1, ed + 1, 0, 0, 0, 0);
    const span = endExclusive.getTime() - start.getTime();
    if (span <= 0) return 1;
    const now = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
    const t = now.getTime() - start.getTime();
    return Math.min(1, Math.max(0, t / span));
}

/**
 * Human-readable slice of the period (day N of M, and % through the period).
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} [ref]
 * @returns {{ spanDays: number, dayOfPeriod: number, pct: number }}
 */
export function calendarProgressLabel(range, ref = new Date()) {
    if (!range?.startYmd || !range?.endYmd) {
        return { spanDays: 0, dayOfPeriod: 0, pct: 0 };
    }
    const [sy, sm, sd] = range.startYmd.split('-').map((x) => parseInt(x, 10));
    const [ey, em, ed] = range.endYmd.split('-').map((x) => parseInt(x, 10));
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const now = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dayNum = Math.round((now.getTime() - start.getTime()) / 86400000) + 1;
    const dayOfPeriod = Math.min(Math.max(1, spanDays), Math.max(1, dayNum));
    const ratio = calendarElapsedRatio(range, ref);
    return { spanDays, dayOfPeriod, pct: Math.round(ratio * 1000) / 10 };
}

/**
 * Goal line height for Overview bar charts (week/month/year toggle).
 * TSS has no volume goal — returns 0.
 * @param {'distance'|'tss'|'elevation'|'moving_time'} metric
 * @param {'week'|'month'|'year'} groupBy
 * @param {unknown} userSettings
 * @returns {number}
 */
export function barChartGoalLineValue(metric, groupBy, userSettings) {
    if (metric === 'tss') return 0;
    const goals = deriveVolumeGoalsFromYearlyGoals(userSettings?.goals);
    const period = groupBy === 'week' ? 'weekly' : groupBy === 'month' ? 'monthly' : 'yearly';
    const g = goals[period];
    if (!g) return 0;
    if (metric === 'distance') return g.distanceKm > 0 ? g.distanceKm : 0;
    if (metric === 'moving_time') return g.movingTimeHours > 0 ? g.movingTimeHours : 0;
    if (metric === 'elevation') return g.elevationM > 0 ? g.elevationM : 0;
    return 0;
}

/**
 * Pace vs linear calendar expectation (Strava-style "on track").
 * @param {number} current
 * @param {number} target
 * @param {{ startYmd: string, endYmd: string }} range
 * @param {Date} [ref]
 * @returns {{
 *   elapsedRatio: number,
 *   expectedCurrent: number,
 *   paceRatio: number | null,
 *   status: 'no_target' | 'early' | 'ahead' | 'on_track' | 'behind'
 * }}
 */
export function getVolumeScheduleStatus(current, target, range, ref = new Date()) {
    const elapsedRatio = calendarElapsedRatio(range, ref);
    if (!target || target <= 0) {
        return {
            elapsedRatio,
            expectedCurrent: 0,
            paceRatio: null,
            status: 'no_target',
        };
    }
    const expectedCurrent = target * elapsedRatio;
    const EARLY = 0.03;
    if (elapsedRatio < EARLY) {
        return {
            elapsedRatio,
            expectedCurrent,
            paceRatio: null,
            status: 'early',
        };
    }
    const paceRatio = expectedCurrent > 1e-9 ? current / expectedCurrent : 1;
    let status = 'on_track';
    if (paceRatio >= 1.08) status = 'ahead';
    else if (paceRatio <= 0.92) status = 'behind';
    return { elapsedRatio, expectedCurrent, paceRatio, status };
}
