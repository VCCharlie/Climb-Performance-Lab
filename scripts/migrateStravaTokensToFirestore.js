/* global process */
/**
 * scripts/migrateStravaTokensToFirestore.js
 *
 * One-time migration: copy an existing Strava refresh_token into Firestore
 * strava_tokens/automation for nightly sync (Admin SDK only).
 *
 * Usage:
 *   node --env-file=.env scripts/migrateStravaTokensToFirestore.js --refresh-token=YOUR_RT
 *   node --env-file=.env scripts/migrateStravaTokensToFirestore.js --from-backup=./backup.json
 *
 * Required env:
 *   FIREBASE_SERVICE_ACCOUNT
 */

import { readFileSync } from 'node:fs';
import {
    initAdminFirestore,
    persistStravaTokens,
    STRAVA_TOKENS_DOC_PATH,
} from './stravaTokenManager.js';

function parseArgs() {
    const refreshArg = process.argv.find((a) => a.startsWith('--refresh-token='));
    const backupArg = process.argv.find((a) => a.startsWith('--from-backup='));

    if (refreshArg) {
        return { refreshToken: refreshArg.split('=').slice(1).join('=').trim() };
    }

    if (backupArg) {
        const path = backupArg.split('=').slice(1).join('=').trim();
        const raw = readFileSync(path, 'utf8');
        const backup = JSON.parse(raw);
        const strava = backup.strava || backup.settings?.strava || {};
        if (!strava.refresh_token) {
            throw new Error(`No refresh_token found in backup file: ${path}`);
        }
        return {
            refreshToken: strava.refresh_token,
            athleteId: strava.athlete_id ?? null,
            accessToken: strava.access_token,
            expiresAt: strava.expires_at,
        };
    }

    throw new Error('Provide --refresh-token=... or --from-backup=path/to.json');
}

async function main() {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountRaw) {
        console.error('[ERROR] Missing FIREBASE_SERVICE_ACCOUNT');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const db = initAdminFirestore(serviceAccount);
    const payload = parseArgs();

    await persistStravaTokens(db, {
        refresh_token: payload.refreshToken,
        access_token: payload.accessToken,
        expires_at: payload.expiresAt,
        athlete_id: payload.athleteId ?? null,
    });

    console.log(`[OK] Stored refresh_token at Firestore ${STRAVA_TOKENS_DOC_PATH}`);
    console.log('[NEXT] Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to GitHub Actions secrets.');
    console.log('[NEXT] Deploy cloud-function/strava_oauth.py as Cloud Run service strava-oauth.');
}

main().catch((err) => {
    console.error('[ERROR]', err.message);
    process.exit(1);
});
