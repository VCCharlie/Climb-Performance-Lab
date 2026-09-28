/**
 * Shared defaults for nightly GitHub Actions sync vs DataHub Intervals sync.
 * DataHub and nightly both use cycling-first sport filters (Run/Walk/Hike off by default).
 * Nightly additionally allows trainer aliases (Workout / IndoorCycling) from Intervals.icu.
 */

import { CYCLING_SPORT_TYPES } from '../config.js';
import { buildDefaultIntervalsSyncSportFilters } from './intervalsSyncSportFilters.js';

/** Extra Intervals types not in Settings sport toggles but common on Intervals.icu. */
export const NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES = ['Workout', 'IndoorCycling'];

/** @returns {Record<string, boolean>} DataHub initial sport filter (cycling types on). */
export function defaultSportFilterMap() {
    return buildDefaultIntervalsSyncSportFilters();
}

/**
 * Sport filters for nightly sync: cycling types + trainer aliases (no Run/Walk/Hike).
 * @returns {string[]}
 */
export function getDefaultNightlyAllowedSportTypes() {
    const set = new Set([...CYCLING_SPORT_TYPES, ...NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES]);
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
