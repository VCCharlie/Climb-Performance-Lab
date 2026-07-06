/**
 * Intervals.icu sync via the deployed Cloud Function (server-side API key).
 * Same endpoint as dashboard eFTP fetch — credentials live in GCP / GitHub secrets.
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export const INTERVALS_CLOUD_SYNC_URL =
    'https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2';

/**
 * @param {{ startDate: string, endDate: string, sportTypes?: string[] }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchIntervalsActivitiesViaCloud({ startDate, endDate, sportTypes = [] }) {
    const body = {
        start_date: startDate,
        end_date: endDate,
    };
    if (sportTypes.length > 0) {
        body.sport_types = sportTypes;
    }

    const response = await fetchWithTimeout(INTERVALS_CLOUD_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const message = errBody?.error || `Cloud sync failed (${response.status})`;
        throw new Error(message);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error('Unexpected response from cloud sync.');
    }
    return data;
}

/** True when the browser can call Intervals.icu directly (local API key). */
export function hasLocalIntervalsCredentials(intervalsConfig) {
    return !!(intervalsConfig?.athleteId && intervalsConfig?.apiKey);
}
