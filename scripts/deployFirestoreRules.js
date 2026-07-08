/**
 * Deploy firestore.rules via Firebase Rules REST API (no firebase-tools deploy).
 * Used by GitHub Actions — avoids serviceusage.googleapis.com permission check.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT JSON.
 * Service account role: Firebase Rules Admin (roles/firebaserules.admin).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'climb-performance-lab';
const RULES_PATH = resolve(process.env.FIRESTORE_RULES_PATH || 'firestore.rules');
const RULES_API = 'https://firebaserules.googleapis.com/v1';

async function getAccessToken() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
        throw new Error('Could not obtain Google access token from service account.');
    }
    return tokenResponse.token;
}

async function rulesApi(token, path, options = {}) {
    const url = `${RULES_API}/${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const text = await res.text();
    if (!res.ok) {
        const err = new Error(`Firebase Rules API ${res.status} ${path}: ${text}`);
        err.status = res.status;
        err.body = text;
        throw err;
    }
    return text ? JSON.parse(text) : {};
}

function iamHelp(status, body) {
    if (status !== 403) return '';
    return [
        '',
        'Permission denied. The GitHub secret FIREBASE_SERVICE_ACCOUNT needs extra IAM roles',
        '(nightly sync only needs Firestore data access; rules deploy needs more).',
        '',
        'In Google Cloud Console → IAM (browser, no local CLI):',
        `  https://console.cloud.google.com/iam-admin/iam?project=${PROJECT_ID}`,
        '  1. Find the service account (client_email in FIREBASE_SERVICE_ACCOUNT JSON).',
        '  2. Add role: Firebase Rules Admin (roles/firebaserules.admin).',
        '  3. Re-run the GitHub Actions workflow.',
        '',
        'Or use Option B in docs/FIRESTORE_RULES.md — paste rules in Firebase Console (your Google login).',
        '',
        `API response: ${body}`,
    ].join('\n');
}

async function main() {
    const content = readFileSync(RULES_PATH, 'utf8');
    const token = await getAccessToken();

    console.log(`[deployFirestoreRules] Creating ruleset for project ${PROJECT_ID}...`);
    let ruleset;
    try {
        ruleset = await rulesApi(token, `projects/${PROJECT_ID}/rulesets`, {
            method: 'POST',
            body: JSON.stringify({
                source: {
                    files: [{ name: 'firestore.rules', content }],
                },
            }),
        });
    } catch (err) {
        console.error(iamHelp(err.status, err.body || err.message));
        throw err;
    }

    if (!ruleset?.name) {
        throw new Error('Rules API did not return a ruleset name.');
    }

    console.log(`[deployFirestoreRules] Publishing release cloud.firestore → ${ruleset.name}`);
    try {
        await rulesApi(
            token,
            `projects/${PROJECT_ID}/releases/cloud.firestore?updateMask=rulesetName`,
            {
                method: 'PATCH',
                body: JSON.stringify({ rulesetName: ruleset.name }),
            },
        );
    } catch (err) {
        console.error(iamHelp(err.status, err.body || err.message));
        throw err;
    }

    console.log('[deployFirestoreRules] Firestore security rules published successfully.');
}

main().catch((err) => {
    console.error('[deployFirestoreRules] Failed:', err.message);
    process.exit(1);
});
