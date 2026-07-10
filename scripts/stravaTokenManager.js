/* global process */
/**
 * scripts/stravaTokenManager.js
 *
 * Server-side Strava OAuth token lifecycle for GitHub Actions / Node automation.
 * Client secret and refresh tokens never belong in the browser or client-readable Firestore.
 *
 * Required environment variables (nightly sync):
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *
 * Refresh tokens are stored at Firestore: strava_tokens/automation (Admin SDK only).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_TOKENS_DOC_PATH = 'strava_tokens/automation';

/**
 * @param {object} serviceAccount - Parsed Firebase service account JSON
 * @returns {import('firebase-admin/firestore').Firestore}
 */
export function initAdminFirestore(serviceAccount) {
    if (getApps().length === 0) {
        initializeApp({ credential: cert(serviceAccount) });
    }
    return getFirestore();
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @returns {Promise<{ refresh_token: string, access_token?: string, expires_at?: number, athlete_id?: number | null } | null>}
 */
export async function loadStoredStravaTokens(db) {
    const snap = await db.doc(STRAVA_TOKENS_DOC_PATH).get();
    if (!snap.exists) {
        return null;
    }
    const data = snap.data();
    if (!data?.refresh_token) {
        return null;
    }
    return {
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expires_at: data.expires_at,
        athlete_id: data.athlete_id ?? null,
    };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {object} tokenPayload
 */
export async function persistStravaTokens(db, tokenPayload) {
    await db.doc(STRAVA_TOKENS_DOC_PATH).set(
        {
            refresh_token: tokenPayload.refresh_token,
            access_token: tokenPayload.access_token,
            expires_at: tokenPayload.expires_at,
            athlete_id: tokenPayload.athlete_id ?? null,
            updated_at: new Date().toISOString(),
        },
        { merge: true },
    );
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function clearStoredStravaTokens(db) {
    await db.doc(STRAVA_TOKENS_DOC_PATH).delete();
}

/**
 * Exchange authorization code for tokens (run once after user OAuth via cloud function).
 * @param {{ code: string, redirectUri: string }} opts
 */
export async function exchangeAuthorizationCode({ code, redirectUri }) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variables.');
    }
    if (!code) {
        throw new Error('Missing authorization code.');
    }

    const response = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Strava authorization_code exchange failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        athlete_id: data.athlete?.id ?? null,
        athlete_name: data.athlete
            ? `${data.athlete.firstname || ''} ${data.athlete.lastname || ''}`.trim()
            : null,
    };
}

/**
 * Refresh access token using stored refresh_token.
 * Strava may rotate refresh_token — always persist the full response.
 * @param {import('firebase-admin/firestore').Firestore} db
 * @returns {Promise<string>} Valid access_token
 */
export async function getValidStravaAccessToken(db) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variables.');
    }

    const stored = await loadStoredStravaTokens(db);
    if (!stored?.refresh_token) {
        throw new Error(
            'No Strava refresh_token in Firestore (strava_tokens/automation). '
            + 'Complete OAuth once via Settings → Connect with Strava, or run scripts/migrateStravaTokensToFirestore.js.',
        );
    }

    const now = Math.floor(Date.now() / 1000);
    if (stored.access_token && stored.expires_at && stored.expires_at > now + 120) {
        return stored.access_token;
    }

    const response = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: stored.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Strava refresh_token grant failed (${response.status}): ${errText}`);
    }

    const data = await response.json();

    await persistStravaTokens(db, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        athlete_id: stored.athlete_id ?? null,
    });

    return data.access_token;
}
