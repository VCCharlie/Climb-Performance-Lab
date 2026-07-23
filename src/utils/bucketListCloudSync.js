/**
 * Firestore persistence for bucket list (cross-device when signed in).
 */

import { doc, setDoc } from 'firebase/firestore';
import { migrateLegacyBucketState } from './bucketListState';

/** Debounce before writing bucket list after local edits. */
export const BUCKET_LIST_CLOUD_DEBOUNCE_MS = 1500;

/**
 * @param {string} uid Firebase Auth uid
 * @returns {string}
 */
export function bucketListSettingsDocId(uid) {
    return `user_${uid}`;
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 * @param {unknown} bucketListState
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function syncBucketListToFirestore(db, uid, bucketListState) {
    if (!db || !uid) {
        return { ok: false, reason: 'no-auth' };
    }

    const payload = migrateLegacyBucketState(bucketListState);
    const settingsId = bucketListSettingsDocId(uid);

    try {
        await setDoc(
            doc(db, 'settings', settingsId),
            {
                bucketList: payload,
                bucketListUpdatedAt: new Date().toISOString(),
            },
            { merge: true },
        );
        return { ok: true };
    } catch (err) {
        console.warn('[Bucket list] Could not sync to Firestore:', err);
        return { ok: false, reason: err?.message || 'write-failed' };
    }
}
