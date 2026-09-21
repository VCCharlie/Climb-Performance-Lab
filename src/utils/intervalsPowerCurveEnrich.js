/**
 * Fill missing best powers (1–120 min) from Intervals.icu power curves.
 * Strava-sourced rides on Intervals often lack Best1min… fields on the activity API;
 * GET /api/v1/activity/{id}/power-curve.json still exposes computed peaks when available.
 */

import { fetchWithTimeout } from './fetchWithTimeout';
import { parseDurationToSeconds } from './formatters';
import { devLog } from './safeLog';

/** @typedef {{ sec: number, w: number }} PowerCurvePoint */

/**
 * Read best mean power (W) at targetSec from a power-curve payload.
 * Supports `secs`+`watts`, `secs`+`values`, or a pre-built points array.
 *
 * @param {object | PowerCurvePoint[] | null | undefined} curve
 * @param {number} targetSec
 * @returns {number}
 */
export function lookupPowerCurveWattsAtDuration(curve, targetSec) {
    const target = Math.floor(Number(targetSec) || 0);
    if (target <= 0 || !curve) return 0;

    /** @type {PowerCurvePoint[]} */
    let points = [];

    if (Array.isArray(curve)) {
        points = curve
            .map((p) => ({ sec: Math.floor(Number(p?.sec) || 0), w: Math.round(Number(p?.w) || 0) }))
            .filter((p) => p.sec > 0 && p.w > 0);
    } else if (Array.isArray(curve.secs)) {
        const wattsArr = Array.isArray(curve.watts) ? curve.watts : curve.values;
        if (!Array.isArray(wattsArr)) return 0;
        const len = Math.min(curve.secs.length, wattsArr.length);
        for (let i = 0; i < len; i += 1) {
            const sec = Math.floor(Number(curve.secs[i]) || 0);
            const w = Math.round(Number(wattsArr[i]) || 0);
            if (sec > 0 && w > 0) points.push({ sec, w });
        }
    }

    if (!points.length) return 0;

    points.sort((a, b) => a.sec - b.sec);

    const exact = points.find((p) => p.sec === target);
    if (exact) return exact.w;

    let lower = null;
    let upper = null;
    for (const p of points) {
        if (p.sec <= target) lower = p;
        if (p.sec >= target) {
            upper = p;
            break;
        }
    }

    if (lower && lower.sec === target) return lower.w;
    if (upper && upper.sec === target) return upper.w;
    if (lower && !upper) return lower.w;
    if (!lower && upper) return upper.w;
    if (lower && upper && upper.sec > lower.sec) {
        const ratio = (target - lower.sec) / (upper.sec - lower.sec);
        return Math.round(lower.w + ratio * (upper.w - lower.w));
    }

    return 0;
}

/**
 * @param {string} activityId
 * @param {{ athleteId?: string, apiKey?: string }} intervalsConfig
 * @returns {Promise<object | null>}
 */
export async function fetchIntervalsActivityPowerCurve(activityId, intervalsConfig) {
    const id = String(activityId || '').trim();
    if (!id || !intervalsConfig?.apiKey) return null;

    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/power-curve.json`;

    const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    });

    if (!resp.ok) {
        devLog(`[Intervals power curve] ${id}: HTTP ${resp.status}`);
        return null;
    }

    return resp.json();
}

/** @typedef {{ field: string, minMovingSec: number, curveSec: number }} PowerCurveBestTarget */

/** @type {PowerCurveBestTarget[]} */
export const STANDARD_POWER_CURVE_BEST_TARGETS = [
    { field: 'best_1min', minMovingSec: 60, curveSec: 60 },
    { field: 'best_5min', minMovingSec: 300, curveSec: 300 },
    { field: 'best_10min', minMovingSec: 600, curveSec: 600 },
    { field: 'best_20min', minMovingSec: 1200, curveSec: 1200 },
    { field: 'best_60min', minMovingSec: 3600, curveSec: 3600 },
];

/** @type {PowerCurveBestTarget[]} */
const LONG_BEST_TARGETS = [
    { field: 'best_90min', minMovingSec: 5400, curveSec: 5400 },
    { field: 'best_120min', minMovingSec: 7200, curveSec: 7200 },
];

/** @type {PowerCurveBestTarget[]} */
export const ALL_POWER_CURVE_BEST_TARGETS = [
    ...STANDARD_POWER_CURVE_BEST_TARGETS,
    ...LONG_BEST_TARGETS,
];

/**
 * @param {object | null | undefined} act
 * @returns {number}
 */
export function activityMovingTimeSeconds(act) {
    const raw = act?.moving_time;
    if (raw == null || raw === '') return 0;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    return Math.floor(parseDurationToSeconds(String(raw)));
}

/**
 * @param {object} act
 * @param {PowerCurveBestTarget[]} targets
 * @returns {PowerCurveBestTarget[]}
 */
export function missingPowerCurveBestTargets(act, targets) {
    const movingSec = activityMovingTimeSeconds(act);
    if (movingSec <= 0) return [];
    return (targets || []).filter(({ field, minMovingSec }) => {
        if (movingSec < minMovingSec) return false;
        return Math.round(Number(act[field]) || 0) <= 0;
    });
}

/**
 * @param {object} act
 * @param {object | null | undefined} curve
 * @param {PowerCurveBestTarget[]} targets
 */
export function applyPowerCurveBestTargets(act, curve, targets) {
    for (const { field, curveSec } of targets || []) {
        const watts = lookupPowerCurveWattsAtDuration(curve, curveSec);
        if (watts > 0) act[field] = watts;
    }
}

/**
 * Fetch Intervals power curves and fill missing 1–120 min best powers.
 *
 * @param {object[]} activities
 * @param {{ athleteId?: string, apiKey?: string }} intervalsConfig
 * @param {{ maxFetches?: number, delayMs?: number, targets?: PowerCurveBestTarget[] }} [opts]
 * @returns {Promise<object[]>}
 */
export async function enrichActivitiesWithPowerCurveBests(activities, intervalsConfig, opts = {}) {
    if (!activities?.length || !intervalsConfig?.apiKey) return activities || [];

    const targets = opts.targets || ALL_POWER_CURVE_BEST_TARGETS;
    const maxFetches = opts.maxFetches ?? 40;
    const delayMs = opts.delayMs ?? 120;
    let fetchCount = 0;

    const out = activities.map((act) => ({ ...act }));

    for (const act of out) {
        if (fetchCount >= maxFetches) break;

        const missing = missingPowerCurveBestTargets(act, targets);
        if (!missing.length) continue;

        let curve;
        try {
            curve = await fetchIntervalsActivityPowerCurve(act.id, intervalsConfig);
        } catch (err) {
            devLog(`[Intervals power curve] ${act.id}: ${err?.message || err}`);
            continue;
        }
        fetchCount += 1;

        if (!curve) continue;

        applyPowerCurveBestTargets(act, curve, missing);

        if (delayMs > 0 && fetchCount < maxFetches) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    if (fetchCount > 0) {
        devLog(`[Intervals power curve] Enriched ${fetchCount} activit${fetchCount === 1 ? 'y' : 'ies'} with power-curve bests`);
    }

    return out;
}

/**
 * Backward-compatible alias: now includes standard 1–60 min bests as well as 90/120 min.
 *
 * @param {object[]} activities
 * @param {{ athleteId?: string, apiKey?: string }} intervalsConfig
 * @param {{ maxFetches?: number, delayMs?: number }} [opts]
 * @returns {Promise<object[]>}
 */
export async function enrichActivitiesWithLongDurationBests(activities, intervalsConfig, opts = {}) {
    return enrichActivitiesWithPowerCurveBests(activities, intervalsConfig, opts);
}
