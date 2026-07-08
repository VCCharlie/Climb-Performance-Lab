/**
 * Intervals.icu sync via the deployed Cloud Function (server-side API key).
 * Sentinel Phase 4.2: requires Firebase ID token (signed-in user).
 */
import { auth } from '../firebase';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export const INTERVALS_CLOUD_SYNC_URL =
    'https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2';

/**
 * @returns {Promise<string>}
 */
export async function getFirebaseIdTokenForCloudSync() {
    if (!auth?.currentUser) {
        throw new Error('Sign in with Google to use cloud Intervals sync.');
    }
    return auth.currentUser.getIdToken();
}

/**
 * @param {{ startDate: string, endDate: string, sportTypes?: string[] }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchIntervalsActivitiesViaCloud({ startDate, endDate, sportTypes = [] }) {
    const idToken = await getFirebaseIdTokenForCloudSync();

    const body = {
        start_date: startDate,
        end_date: endDate,
    };
    if (sportTypes.length > 0) {
        body.sport_types = sportTypes;
    }

    const response = await fetchWithTimeout(INTERVALS_CLOUD_SYNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
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
