/**
 * Resolve Firestore user settings for GitHub Actions nightly sync (Node-safe).
 * Mirrors browser DataHub sync: range, Fast/Full depth, merge prefs, enrich caps.
 */
import { mergeUserSettingsWithDefaults } from './userSettingsMerge.js';
import { buildMergeProtectOpts } from './mergeProtectOptions.js';
import { resolveSyncEnrichLimits } from './syncEnrichLimits.js';
import {
    describeSyncDepth,
    isFullSyncDepth,
    normalizeSyncDepth,
} from './intervalsSyncDepth.js';
import { ownerUidFromSettingsDocId } from './activityOwnershipCore.js';

/**
 * @typedef {object} NightlySyncContext
 * @property {ReturnType<typeof mergeUserSettingsWithDefaults>} userSettings
 * @property {number} lookbackDays
 * @property {'fast' | 'full'} syncDepth
 * @property {boolean} isFullSync
 * @property {ReturnType<typeof resolveSyncEnrichLimits>} enrichLimits
 * @property {number} profileFtp
 * @property {{ deviceProfileTitles: string[], dataSourcePrefs: object, ownerUid: string | null }} mergeOpts
 * @property {string} syncDepthLabel
 */

/**
 * @param {Record<string, unknown> | null | undefined} settingsBody — Firestore settings doc `body`
 * @param {{ settingsDocId?: string | null, ownerUidEnv?: string | null }} [meta]
 * @returns {NightlySyncContext}
 */
export function resolveNightlySyncContext(settingsBody, meta = {}) {
    const userSettings = mergeUserSettingsWithDefaults(settingsBody);
    const syncDepth = normalizeSyncDepth(userSettings.defaultIntervalsSyncDepth);
    const lookbackDays = Number(userSettings.defaultSyncRangeDays) > 0
        ? Math.round(Number(userSettings.defaultSyncRangeDays))
        : 14;

    const ownerUid =
        ownerUidFromSettingsDocId(meta.settingsDocId)
        || (meta.ownerUidEnv ? String(meta.ownerUidEnv).trim() : null)
        || null;

    const mergeBase = buildMergeProtectOpts(userSettings);

    return {
        userSettings,
        lookbackDays,
        syncDepth,
        isFullSync: isFullSyncDepth(syncDepth),
        enrichLimits: resolveSyncEnrichLimits(userSettings),
        profileFtp: Number(userSettings.ftp) || 0,
        mergeOpts: {
            deviceProfileTitles: mergeBase.deviceProfileTitles,
            dataSourcePrefs: mergeBase.dataSourcePrefs,
            ownerUid,
        },
        syncDepthLabel: describeSyncDepth(syncDepth),
    };
}

/**
 * Pick the primary settings document (same heuristics as nightlySync.js).
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{ settingsDocId?: string }} [env]
 * @returns {Promise<{ docId: string, body: Record<string, unknown>, ref: import('firebase-admin/firestore').DocumentReference } | null>}
 */
export async function loadNightlySyncSettingsDoc(db, env = {}) {
    const explicitId = (env.settingsDocId || '').trim();
    if (explicitId) {
        const snap = await db.doc(`settings/${explicitId}`).get();
        if (snap.exists) {
            const body = snap.data()?.body;
            return {
                docId: explicitId,
                body: body && typeof body === 'object' && !Array.isArray(body) ? body : {},
                ref: snap.ref,
            };
        }
    }

    const settingsSnaps = await db.collection('settings').limit(20).get();
    const userDoc = settingsSnaps.docs.find(
        (d) => d.id.startsWith('user_') && d.id !== 'user_prefs' && ownerUidFromSettingsDocId(d.id),
    );
    const chosen = userDoc || settingsSnaps.docs[0];
    if (!chosen) return null;

    const body = chosen.data()?.body;
    return {
        docId: chosen.id,
        body: body && typeof body === 'object' && !Array.isArray(body) ? body : {},
        ref: chosen.ref,
    };
}
