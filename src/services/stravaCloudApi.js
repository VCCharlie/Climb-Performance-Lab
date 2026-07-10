/**
 * src/services/stravaCloudApi.js
 * Strava OAuth via server-side Cloud Run (client secret never in the browser).
 */
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { STRAVA_OAUTH_URL } from '../config';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const AUTH_WAIT_MS = 15000;

/**
 * After a Strava redirect the page reloads before Firebase restores the session.
 * Wait briefly for onAuthStateChanged instead of failing immediately.
 */
function waitForFirebaseUser(timeoutMs = AUTH_WAIT_MS) {
    return new Promise((resolve, reject) => {
        if (!auth) {
            reject(new Error('Sign in with Google to connect Strava.'));
            return;
        }
        if (auth.currentUser) {
            resolve(auth.currentUser);
            return;
        }

        let unsub = () => {};
        const timer = setTimeout(() => {
            unsub();
            reject(new Error('Sign in with Google to connect Strava.'));
        }, timeoutMs);

        unsub = onAuthStateChanged(auth, (user) => {
            if (!user) return;
            clearTimeout(timer);
            unsub();
            resolve(user);
        });
    });
}

async function getFirebaseIdToken() {
    const user = await waitForFirebaseUser();
    return user.getIdToken();
}

function stravaOAuthUrl(route = '') {
    const base = STRAVA_OAUTH_URL.replace(/\/$/, '');
    if (!route) {
        return base;
    }
    return `${base}?route=${encodeURIComponent(route)}`;
}

/**
 * Public Strava client_id from server config (not a secret).
 * @returns {Promise<string>}
 */
export async function fetchStravaClientIdFromCloud() {
    const response = await fetchWithTimeout(stravaOAuthUrl('config'), {
        method: 'GET',
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Strava config unavailable (${response.status})`);
    }

    const data = await response.json();
    if (!data?.client_id) {
        throw new Error('Strava client_id missing from server config.');
    }
    return String(data.client_id);
}

/**
 * Exchange OAuth authorization code for server-stored refresh token.
 * @param {{ code: string, redirectUri: string }} opts
 */
export async function exchangeStravaCodeViaCloud({ code, redirectUri }) {
    const idToken = await getFirebaseIdToken();

    const response = await fetchWithTimeout(stravaOAuthUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            action: 'exchange',
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Strava OAuth exchange failed (${response.status})`);
    }

    return response.json();
}

/**
 * Short-lived Strava access token (server refreshes when needed).
 * @returns {Promise<string>}
 */
export async function fetchStravaAccessTokenViaCloud() {
    const idToken = await getFirebaseIdToken();

    const response = await fetchWithTimeout(stravaOAuthUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: 'token' }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Strava token request failed (${response.status})`);
    }

    const data = await response.json();
    if (!data?.access_token) {
        throw new Error('No access_token returned from Strava OAuth service.');
    }
    return data.access_token;
}

/** Clear server-stored Strava tokens (disconnect). */
export async function disconnectStravaViaCloud() {
    const idToken = await getFirebaseIdToken();

    const response = await fetchWithTimeout(stravaOAuthUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: 'disconnect' }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || `Strava disconnect failed (${response.status})`);
    }
}

/**
 * Resolve Strava client_id: build-time env first, then cloud config endpoint.
 * @returns {Promise<string>}
 */
export async function resolveStravaClientId() {
    const fromEnv = (import.meta.env.VITE_STRAVA_CLIENT_ID || '').trim();
    if (fromEnv) {
        return fromEnv;
    }
    return fetchStravaClientIdFromCloud();
}
