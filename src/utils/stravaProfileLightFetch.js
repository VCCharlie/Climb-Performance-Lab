/**
 * Lightweight Strava profile fetch: athlete + official ride stats only.
 * Avoids activity list scan, KOMs, and starred segments (~2 API calls vs 100+).
 */

import { stravaHttpErrorMessage } from './stravaHttp';

const STRAVA_BASE = 'https://www.strava.com/api/v3';

/**
 * @param {string} token
 * @param {string|number} athleteId
 * @returns {Promise<{ athlete: object|null, stats: object }>}
 */
export async function fetchStravaAthleteAndStats(token, athleteId) {
    if (!token) throw new Error('Strava token missing — connect Strava in Settings.');
    if (athleteId == null || athleteId === '') throw new Error('Strava athlete ID missing — reconnect Strava in Settings.');

    const headers = { Authorization: `Bearer ${token}` };

    const athleteResp = await fetch(`${STRAVA_BASE}/athlete`, { headers });
    const athlete = athleteResp.ok ? await athleteResp.json() : null;

    const statsResp = await fetch(`${STRAVA_BASE}/athletes/${athleteId}/stats`, { headers });
    if (!statsResp.ok) {
        throw new Error(stravaHttpErrorMessage(statsResp, 'Strava stats error'));
    }
    const stats = await statsResp.json();

    return { athlete, stats };
}

/**
 * Merge stats-only API payload into existing persisted profile (keeps scan/KOMs/etc.).
 * @param {object|null|undefined} prev
 * @param {{ athlete?: object|null, stats: object, fetchedAt?: string }} patch
 * @returns {object}
 */
export function mergeStravaProfileStatsOnly(prev, patch) {
    const fetchedAt = patch.fetchedAt || new Date().toISOString();
    const base = prev && typeof prev === 'object' ? { ...prev } : {};
    const athlete = patch.athlete ?? base.athlete ?? null;
    const bikes = Array.isArray(athlete?.bikes)
        ? [...athlete.bikes].sort((a, b) => (b.distance || 0) - (a.distance || 0))
        : base.bikes;

    return {
        ...base,
        athlete,
        stats: patch.stats,
        bikes: bikes ?? base.bikes,
        fetchedAt,
        statsFetchedAt: fetchedAt,
    };
}
