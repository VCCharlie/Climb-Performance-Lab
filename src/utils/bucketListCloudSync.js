/**
 * Firestore persistence for bucket list (cross-device when signed in).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
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
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {string | null}
 */
export function newerIsoTimestamp(a, b) {
    const aMs = a ? Date.parse(a) : 0;
    const bMs = b ? Date.parse(b) : 0;
    if (Number.isNaN(aMs)) return b || null;
    if (Number.isNaN(bMs)) return a || null;
    if (aMs >= bMs) return a;
    return b;
}

function pickClimbPbsByLatestScan(local, cloud) {
    const localScan = local?.pbScanCompletedAt;
    const cloudScan = cloud?.pbScanCompletedAt;
    const localMs = localScan ? Date.parse(localScan) : 0;
    const cloudMs = cloudScan ? Date.parse(cloudScan) : 0;
    if (localMs > cloudMs) return local.climbPbs || {};
    if (cloudMs > localMs) return cloud.climbPbs || {};
    return null;
}

/**
 * Pick local vs cloud bucket list by bucketListUpdatedAt (last write wins).
 *
 * @param {unknown} localState
 * @param {string | null | undefined} localUpdatedAt
 * @param {unknown} cloudState
 * @param {string | null | undefined} cloudUpdatedAt
 */
export function resolveBucketListOnSync(localState, localUpdatedAt, cloudState, cloudUpdatedAt) {
    const local = migrateLegacyBucketState(localState);
    const cloud = cloudState ? migrateLegacyBucketState(cloudState) : null;

    const localAt = local.updatedAt || localUpdatedAt || null;
    const cloudAt = cloud?.updatedAt || cloudUpdatedAt || null;

    if (!cloud) {
        return { state: local, source: 'local' };
    }

    const localMs = localAt ? Date.parse(localAt) : 0;
    const cloudMs = cloudAt ? Date.parse(cloudAt) : 0;

    if (!localAt && cloudAt) {
        return { state: { ...cloud, updatedAt: cloudAt }, source: 'cloud' };
    }
    if (localAt && !cloudAt) {
        return { state: { ...local, updatedAt: localAt }, source: 'local' };
    }
    if (!localAt && !cloudAt) {
        return { state: { ...cloud, updatedAt: cloudAt || new Date().toISOString() }, source: 'cloud' };
    }

    if (cloudMs > localMs) {
        const climbPbs = pickClimbPbsByLatestScan(local, cloud) ?? cloud.climbPbs;
        return {
            state: { ...cloud, climbPbs, updatedAt: cloudAt, pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt) },
            source: 'cloud',
        };
    }
    if (localMs > cloudMs) {
        const climbPbs = pickClimbPbsByLatestScan(local, cloud) ?? local.climbPbs;
        return {
            state: { ...local, climbPbs, updatedAt: localAt, pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt) },
            source: 'local',
        };
    }

    const climbPbs = pickClimbPbsByLatestScan(local, cloud) ?? cloud.climbPbs;
    return {
        state: {
            ...cloud,
            climbPbs,
            updatedAt: cloudAt || localAt,
            pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt),
        },
        source: 'cloud',
    };
}

/**
 * @param {unknown} state
 * @returns {{ climbStatus: object, climbPbs: object, updatedAt: string }}
 */
export function stampBucketListState(state) {
    const migrated = migrateLegacyBucketState(state);
    return {
        ...migrated,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Apply a Bucket List child update onto the previous parent state.
 * Status-only edits omit pbScanCompletedAt; dropping it would let older devices
 * win PB merges via pickClimbPbsByLatestScan and regress/wipe newer PBs.
 *
 * @param {unknown} previousState
 * @param {unknown} incomingState
 * @returns {{ climbStatus: object, climbPbs: object, updatedAt: string, pbScanCompletedAt: string | null }}
 */
export function applyBucketListStateChange(previousState, incomingState) {
    const previous = migrateLegacyBucketState(previousState);
    const incoming = migrateLegacyBucketState(incomingState);
    return stampBucketListState({
        climbStatus: incoming.climbStatus,
        climbPbs: incoming.climbPbs,
        pbScanCompletedAt: incoming.pbScanCompletedAt ?? previous.pbScanCompletedAt,
    });
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
    const updatedAt = payload.updatedAt || new Date().toISOString();
    const stamped = { ...payload, updatedAt };

    const settingsId = bucketListSettingsDocId(uid);

    try {
        await setDoc(
            doc(db, 'settings', settingsId),
            {
                bucketList: stamped,
                bucketListUpdatedAt: updatedAt,
            },
            { merge: true },
        );
        return { ok: true, updatedAt };
    } catch (err) {
        console.warn('[Bucket list] Could not sync to Firestore:', err);
        return { ok: false, reason: err?.message || 'write-failed' };
    }
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 * @returns {Promise<{ state: ReturnType<typeof migrateLegacyBucketState>, updatedAt: string | null } | null>}
 */
export async function fetchBucketListFromFirestore(db, uid) {
    if (!db || !uid) return null;

    const settingsId = bucketListSettingsDocId(uid);
    const docSnap = await getDoc(doc(db, 'settings', settingsId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    if (!data?.bucketList) return null;

    const migrated = migrateLegacyBucketState(data.bucketList);
    const updatedAt = data.bucketListUpdatedAt || migrated.updatedAt || null;
    return {
        state: { ...migrated, updatedAt },
        updatedAt,
    };
}
