/**
 * Compute best mean powers (1–60 min) from Strava activity streams when Intervals
 * has no FIT/power-curve (common for Strava-sourced rides without an original file).
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { devLog } from './safeLog.js';
import { normalizeStravaActivityId } from './strava.js';
import {
    ALL_POWER_CURVE_BEST_TARGETS,
    missingPowerCurveBestTargets,
} from './intervalsPowerCurveEnrich.js';

function extractSeries(streamBlock) {
    if (Array.isArray(streamBlock)) {
        return streamBlock.map((v) => Number(v));
    }
    if (streamBlock && Array.isArray(streamBlock.data)) {
        return streamBlock.data.map((v) => Number(v));
    }
    return null;
}

/**
 * @param {unknown} payload Strava streams JSON (key_by_type object or array)
 * @returns {{ time: number[], watts: number[] } | null}
 */
export function parseStravaWattsStream(payload) {
    if (!payload) return null;

    let root = payload;
    if (Array.isArray(payload)) {
        const byType = {};
        for (const entry of payload) {
            const type = String(entry?.type || '').toLowerCase();
            if (type) byType[type] = entry;
        }
        root = byType;
    }

    const wattsRaw = root.watts ?? root.power;
    const timeRaw = root.time;
    const movingRaw = root.moving;

    const wattsAll = extractSeries(wattsRaw);
    const timeAll = extractSeries(timeRaw);
    const movingAll = extractSeries(movingRaw);

    if (!wattsAll?.length) return null;

    const length = wattsAll.length;
    const time = timeAll?.length === length
        ? timeAll
        : Array.from({ length }, (_, i) => i);

    const watts = [];
    const filteredTime = [];

    for (let i = 0; i < length; i += 1) {
        const w = Number(wattsAll[i]);
        if (!Number.isFinite(w) || w <= 0) continue;
        if (movingAll?.length === length && !movingAll[i]) continue;
        watts.push(w);
        filteredTime.push(Number.isFinite(Number(time[i])) ? Number(time[i]) : i);
    }

    if (watts.length < 60) return null;

    return { time: filteredTime, watts };
}

/**
 * Max mean power (W) over any contiguous window of at least durationSec seconds.
 *
 * @param {number[]} watts
 * @param {number[]} timeSec
 * @param {number} durationSec
 * @returns {number}
 */
export function computeMaxMeanPowerForDuration(watts, timeSec, durationSec) {
    const n = watts?.length || 0;
    const target = Math.floor(Number(durationSec) || 0);
    if (n === 0 || target <= 0) return 0;

    const time = (timeSec?.length === n)
        ? timeSec
        : Array.from({ length: n }, (_, i) => i);

    const isUniformOneHz = time.every((t, i) => i === 0 || Math.abs((t - time[i - 1]) - 1) < 0.01);

    if (isUniformOneHz && n >= target) {
        let best = 0;
        let sum = 0;
        for (let i = 0; i < n; i += 1) {
            sum += Number(watts[i]) || 0;
            if (i >= target) sum -= Number(watts[i - target]) || 0;
            if (i >= target - 1) {
                const avg = sum / target;
                if (avg > best) best = avg;
            }
        }
        return Math.round(best);
    }

    let best = 0;
    let start = 0;
    let sum = 0;

    for (let end = 0; end < n; end += 1) {
        const w = Number(watts[end]);
        if (!Number.isFinite(w) || w <= 0) continue;

        sum += w;

        while (start < end && time[end] - time[start] > target) {
            const ws = Number(watts[start]);
            if (Number.isFinite(ws) && ws > 0) sum -= ws;
            start += 1;
        }

        const elapsed = time[end] - time[start];
        const samples = end - start + 1;
        if (samples <= 0) continue;

        if (elapsed >= target - 0.5) {
            const avg = sum / samples;
            if (avg > best) best = avg;
        }
    }

    return Math.round(best);
}

/**
 * @param {number[]} watts
 * @param {number[]} timeSec
 * @param {{ field: string, curveSec: number }[]} targets
 * @returns {Record<string, number>}
 */
export function computeBestPowersFromWattsStream(watts, timeSec, targets) {
    /** @type {Record<string, number>} */
    const out = {};
    for (const { field, curveSec } of targets || []) {
        const value = computeMaxMeanPowerForDuration(watts, timeSec, curveSec);
        if (value > 0) out[field] = value;
    }
    return out;
}

/**
 * @param {string | number} stravaActivityId
 * @param {string} token
 * @returns {Promise<{ time: number[], watts: number[] } | null>}
 */
export async function fetchStravaWattsStream(stravaActivityId, token) {
    const id = normalizeStravaActivityId(stravaActivityId);
    if (!id || !token) return null;

    const url = `https://www.strava.com/api/v3/activities/${encodeURIComponent(id)}/streams?keys=time,watts,moving&key_by_type=true`;

    try {
        const resp = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.status === 429) {
            devLog(`[Strava watts stream] ${id}: rate limited`);
            return null;
        }
        if (!resp.ok) {
            devLog(`[Strava watts stream] ${id}: HTTP ${resp.status}`);
            return null;
        }
        return parseStravaWattsStream(await resp.json());
    } catch (err) {
        devLog(`[Strava watts stream] ${id}: ${err?.message || err}`);
        return null;
    }
}

/**
 * Fill missing standard best powers on one activity from Strava streams.
 *
 * @param {object} act normalized site activity (mutated copy returned)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function enrichActivityBestPowersFromStravaStream(act, token) {
    const out = { ...act };
    const missing = missingPowerCurveBestTargets(out, ALL_POWER_CURVE_BEST_TARGETS);
    if (!missing.length || !out.strava_id || !token) return out;

    const stream = await fetchStravaWattsStream(out.strava_id, token);
    if (!stream) return out;

    const computed = computeBestPowersFromWattsStream(stream.watts, stream.time, missing);
    for (const [field, value] of Object.entries(computed)) {
        if (value > 0) out[field] = value;
    }
    return out;
}

/**
 * After Intervals power-curve enrichment, backfill remaining bests from Strava streams.
 *
 * @param {object[]} activities
 * @param {{ stravaToken?: string | null, stravaGetToken?: () => Promise<string>, maxFetches?: number }} [opts]
 * @returns {Promise<object[]>}
 */
export async function enrichActivitiesWithStravaStreamBestPowers(activities, opts = {}) {
    const list = activities || [];
    if (list.length === 0) return [];

    let token = opts.stravaToken || null;
    if (!token && opts.stravaGetToken) {
        try {
            token = await opts.stravaGetToken();
        } catch {
            token = null;
        }
    }
    if (!token) return list.map((a) => ({ ...a }));

    const maxFetches = opts.maxFetches ?? list.length;
    const out = [];
    let fetchCount = 0;

    for (const act of list) {
        const missing = missingPowerCurveBestTargets(act, ALL_POWER_CURVE_BEST_TARGETS);
        if (!missing.length || !act.strava_id || fetchCount >= maxFetches) {
            out.push({ ...act });
            continue;
        }
        fetchCount += 1;
        out.push(await enrichActivityBestPowersFromStravaStream(act, token));
    }

    if (fetchCount > 0) {
        devLog(`[Strava stream bests] Computed peaks for ${fetchCount} activit${fetchCount === 1 ? 'y' : 'ies'}`);
    }

    return out;
}
