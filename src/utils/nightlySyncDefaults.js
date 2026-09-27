/**
 * Shared defaults for nightly GitHub Actions sync vs DataHub Intervals sync.
 * DataHub enables all `SPORT_TYPES` from config on first load; nightly uses the same
 * set plus trainer aliases (Workout / IndoorCycling) that Intervals often assigns.
 */

import { SPORT_TYPES } from '../config.js';

/** Extra Intervals types not in Settings sport toggles but common on Intervals.icu. */
export const NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES = ['Workout', 'IndoorCycling'];

/** @returns {Record<string, boolean>} Same as DataHub initial sport filter (all on). */
export function defaultSportFilterMap() {
    return SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {});
}

/**
 * Sport filters aligned with DataHub default (all config types on) + nightly trainer types.
 * @returns {string[]}
 */
export function getDefaultNightlyAllowedSportTypes() {
    const set = new Set([...SPORT_TYPES, ...NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES]);
    return [...set];
}

/**
 * Minimal intervals config for sparse Strava backfill (same shape as browser localStorage).
 * @param {{ athleteId?: string, apiKey?: string }} params
 * @returns {object | null}
 */
export function buildNightlyIntervalsConfig({ athleteId, apiKey }) {
    const id = athleteId != null ? String(athleteId).trim() : '';
    const key = apiKey != null ? String(apiKey).trim() : '';
    if (!id || !key) return null;
    return { athleteId: id, apiKey: key };
}
