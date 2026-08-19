/**
 * Fetch activity streams from Intervals.icu for decoupling analysis.
 */

import { fetchWithTimeout } from './fetchWithTimeout';
import { devLog } from './safeLog';
import { normalizeActivityStreams } from './activityStreamNormalize';

/**
 * @param {string} activityId
 * @param {{ apiKey?: string }} intervalsConfig
 * @returns {Promise<{ time: number[], watts: number[], heartrate: number[] } | null>}
 */
export async function fetchIntervalsActivityStreams(activityId, intervalsConfig) {
    const id = String(activityId || '').trim();
    if (!id || !intervalsConfig?.apiKey) return null;

    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/streams?types=time,watts,heartrate`;

    try {
        const resp = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${authString}`,
                Accept: 'application/json',
            },
        });

        if (!resp.ok) {
            devLog(`[Intervals streams] ${id}: HTTP ${resp.status}`);
            return null;
        }

        const json = await resp.json();
        return normalizeActivityStreams(json, 'intervals');
    } catch (err) {
        devLog(`[Intervals streams] ${id}: ${err?.message || err}`);
        return null;
    }
}
