/**
 * Firestore persistence for bucket list (cross-device when signed in).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { migrateLegacyBucketState } from './bucketListState';
import {
    climbPbsWithoutDismissed,
    unionDismissedPbClimbIds,
} from './bucketListPbDismiss';

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
 * When both sides share the same PB scan time, use climbPbs from the side with the newer bucket write.
 * @param {ReturnType<typeof migrateLegacyBucketState>} local
 * @param {ReturnType<typeof migrateLegacyBucketState>} cloud
 * @param {string | null | undefined} localAt
 * @param {string | null | undefined} cloudAt
 */
function pickClimbPbsForMerge(local, cloud, localAt, cloudAt) {
    const byScan = pickClimbPbsByLatestScan(local, cloud);
    if (byScan !== null) return byScan;

    const localMs = localAt ? Date.parse(localAt) : 0;
    const cloudMs = cloudAt ? Date.parse(cloudAt) : 0;
    if (localMs > cloudMs) return local.climbPbs || {};
    if (cloudMs > localMs) return cloud.climbPbs || {};
    return local.climbPbs || {};
}

function finalizeMergedBucketState(baseState, local, cloud) {
    const dismissedPbClimbIds = unionDismissedPbClimbIds(
        local?.dismissedPbClimbIds,
        cloud?.dismissedPbClimbIds,
    );
    const climbPbs = climbPbsWithoutDismissed(baseState.climbPbs, dismissedPbClimbIds);
    return {
        ...baseState,
        climbPbs,
        dismissedPbClimbIds,
    };
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
        return {
            state: finalizeMergedBucketState({ ...local, updatedAt: localAt }, local, local),
            source: 'local',
        };
    }

    const localMs = localAt ? Date.parse(localAt) : 0;
    const cloudMs = cloudAt ? Date.parse(cloudAt) : 0;

    if (!localAt && cloudAt) {
        return {
            state: finalizeMergedBucketState({ ...cloud, updatedAt: cloudAt }, local, cloud),
            source: 'cloud',
        };
    }
    if (localAt && !cloudAt) {
        return {
            state: finalizeMergedBucketState({ ...local, updatedAt: localAt }, local, cloud),
            source: 'local',
        };
    }
    if (!localAt && !cloudAt) {
        return {
            state: finalizeMergedBucketState(
                { ...cloud, updatedAt: cloudAt || new Date().toISOString() },
                local,
                cloud,
            ),
            source: 'cloud',
        };
    }

    if (cloudMs > localMs) {
        const climbPbs = pickClimbPbsForMerge(local, cloud, localAt, cloudAt);
        return {
            state: finalizeMergedBucketState(
                {
                    ...cloud,
                    climbPbs,
                    updatedAt: cloudAt,
                    pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt),
                },
                local,
                cloud,
            ),
            source: 'cloud',
        };
    }
    if (localMs > cloudMs) {
        const climbPbs = pickClimbPbsForMerge(local, cloud, localAt, cloudAt);
        return {
            state: finalizeMergedBucketState(
                {
                    ...local,
                    climbPbs,
                    updatedAt: localAt,
                    pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt),
                },
                local,
                cloud,
            ),
            source: 'local',
        };
    }

    const climbPbs = pickClimbPbsForMerge(local, cloud, localAt, cloudAt);
    return {
        state: finalizeMergedBucketState(
            {
                ...cloud,
                climbPbs,
                updatedAt: cloudAt || localAt,
                pbScanCompletedAt: newerIsoTimestamp(local.pbScanCompletedAt, cloud.pbScanCompletedAt),
            },
            local,
            cloud,
        ),
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
    const dismissedPbClimbIds = unionDismissedPbClimbIds(
        previous.dismissedPbClimbIds,
        incoming.dismissedPbClimbIds,
    );
    return stampBucketListState({
        climbStatus: incoming.climbStatus,
        climbPbs: climbPbsWithoutDismissed(incoming.climbPbs, dismissedPbClimbIds),
        pbScanCompletedAt: incoming.pbScanCompletedAt ?? previous.pbScanCompletedAt,
        dismissedPbClimbIds,
    });
}

/**
 * Whether a bucket list edit should bypass debounce and write Firestore immediately.
 * @param {ReturnType<typeof migrateLegacyBucketState>} previous
 * @param {ReturnType<typeof migrateLegacyBucketState>} stamped
 */
export function shouldImmediateSyncBucketList(previous, stamped) {
    if (stamped.pbScanCompletedAt && stamped.pbScanCompletedAt !== previous.pbScanCompletedAt) {
        return true;
    }
    const prevDismissed = new Set((previous.dismissedPbClimbIds || []).map(String));
    const nextDismissed = new Set((stamped.dismissedPbClimbIds || []).map(String));
    if (nextDismissed.size > prevDismissed.size) {
        return true;
    }
    const prevPbKeys = Object.keys(previous.climbPbs || {});
    const nextPbKeys = Object.keys(stamped.climbPbs || {});
    if (prevPbKeys.length !== nextPbKeys.length) {
        return true;
    }
    for (const key of prevPbKeys) {
        if (!stamped.climbPbs[key]) return true;
    }
    return false;
}

/**
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid
 * @param {ReturnType<typeof migrateLegacyBucketState> & { updatedAt: string }} stamped
 * @returns {Promise<{ ok: boolean, reason?: string, updatedAt?: string }>}
 */
async function writeBucketListDoc(db, uid, stamped) {
    const settingsId = bucketListSettingsDocId(uid);
    try {
        await setDoc(
            doc(db, 'settings', settingsId),
            {
                bucketList: stamped,
                bucketListUpdatedAt: stamped.updatedAt,
            },
            { merge: true },
        );
        return { ok: true, updatedAt: stamped.updatedAt };
    } catch (err) {
        console.warn('[Bucket list] Could not sync to Firestore:', err);
        return { ok: false, reason: err?.message || 'write-failed' };
    }
}

/** Latest unpaid write — newer syncs replace older ones while a write is in flight. */
let pendingBucketListSyncJob = null;
/** Promise chain that serializes Firestore writes for the bucket list document. */
let bucketListSyncChain = Promise.resolve();
/** Injectable writer for unit tests (race / coalesce coverage). */
let bucketListDocWriter = writeBucketListDoc;

/**
 * Reset in-memory sync queue (unit tests only).
 * @internal
 */
export function __resetBucketListFirestoreSyncQueueForTests() {
    pendingBucketListSyncJob = null;
    bucketListSyncChain = Promise.resolve();
    bucketListDocWriter = writeBucketListDoc;
}

/**
 * Override Firestore writer (unit tests only).
 * @param {typeof writeBucketListDoc | null} writer
 * @internal
 */
export function __setBucketListFirestoreWriterForTests(writer) {
    bucketListDocWriter = writer || writeBucketListDoc;
}

/**
 * Persist bucket list to Firestore. Concurrent calls are serialized and coalesced:
 * an older in-flight write cannot overwrite a newer dismiss/scan payload.
 *
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 * @param {unknown} bucketListState
 * @returns {Promise<{ ok: boolean, reason?: string, updatedAt?: string }>}
 */
export function syncBucketListToFirestore(db, uid, bucketListState) {
    if (!db || !uid) {
        return Promise.resolve({ ok: false, reason: 'no-auth' });
    }

    const payload = migrateLegacyBucketState(bucketListState);
    const updatedAt = payload.updatedAt || new Date().toISOString();
    const stamped = { ...payload, updatedAt };

    pendingBucketListSyncJob = { db, uid, stamped };

    const run = bucketListSyncChain.then(async () => {
        let lastResult = { ok: true, reason: 'coalesced' };
        while (pendingBucketListSyncJob) {
            const job = pendingBucketListSyncJob;
            pendingBucketListSyncJob = null;
            lastResult = await bucketListDocWriter(job.db, job.uid, job.stamped);
        }
        return lastResult;
    });

    // Keep the mutex alive even when a write rejects unexpectedly.
    bucketListSyncChain = run.then(
        () => undefined,
        () => undefined,
    );

    return run;
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
