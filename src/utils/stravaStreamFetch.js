/**
 * Fetch activity streams from Strava for decoupling analysis.
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { devLog } from './safeLog.js';
import { normalizeStravaActivityId } from './strava.js';
import { normalizeActivityStreams } from './activityStreamNormalize.js';

/**
 * @param {string | number} stravaActivityId
 * @param {string} token
 * @returns {Promise<{ time: number[], watts: number[], heartrate: number[] } | null>}
 */
export async function fetchStravaActivityStreams(stravaActivityId, token) {
    const id = normalizeStravaActivityId(stravaActivityId);
    if (!id || !token) return null;

    const url = `https://www.strava.com/api/v3/activities/${encodeURIComponent(id)}/streams?keys=time,watts,heartrate,moving&key_by_type=true`;

    try {
        const resp = await fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (resp.status === 429) {
            devLog(`[Strava streams] ${id}: rate limited`);
            return null;
        }
        if (!resp.ok) {
            devLog(`[Strava streams] ${id}: HTTP ${resp.status}`);
            return null;
        }

        const json = await resp.json();
        return normalizeActivityStreams(json, 'strava');
    } catch (err) {
        devLog(`[Strava streams] ${id}: ${err?.message || err}`);
        return null;
    }
}
