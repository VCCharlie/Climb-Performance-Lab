/**
 * Firestore persistence for event training goals (cross-device when signed in).
 * Stored on settings/user_{uid} alongside coach week state — separate from yearly volume goals.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { normalizeTrainingPlanSnapshot } from './trainingPlanSnapshot';

export const TRAINING_PLAN_CLOUD_DEBOUNCE_MS = 1500;
export const TRAINING_PLAN_LOCAL_GRACE_MS = TRAINING_PLAN_CLOUD_DEBOUNCE_MS + 2000;

/**
 * @param {string} uid
 */
export function trainingPlanSettingsDocId(uid) {
    return `user_${uid}`;
}

/**
 * @param {object | null | undefined} raw
 * @returns {object | null}
 */
export function normalizeCloudTrainingPlan(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return normalizeTrainingPlanSnapshot(raw);
}

/**
 * @param {object | null} localSnapshot
 * @param {string | null | undefined} localClearedAt
 * @returns {string | null}
 */
export function localTrainingPlanTimestamp(localSnapshot, localClearedAt) {
    if (localSnapshot?.updatedAt) return localSnapshot.updatedAt;
    return localClearedAt || null;
}

/**
 * Last-write-wins merge for event training goal snapshots.
 *
 * @param {object | null} localSnapshot
 * @param {string | null | undefined} localClearedAt ISO when user cleared locally
 * @param {object | null | undefined} cloudSnapshot
 * @param {string | null | undefined} cloudUpdatedAt top-level Firestore timestamp / ISO
 */
export function resolveTrainingPlanOnSync(
    localSnapshot,
    localClearedAt,
    cloudSnapshot,
    cloudUpdatedAt,
) {
    const local = normalizeTrainingPlanSnapshot(localSnapshot);
    const cloud = normalizeCloudTrainingPlan(cloudSnapshot);
    const localMs = Date.parse(localTrainingPlanTimestamp(local, localClearedAt) || '') || 0;
    const cloudMs = Date.parse(cloud?.updatedAt || cloudUpdatedAt || '') || 0;

    if (!local && !cloud) {
        return { snapshot: null, source: 'none' };
    }

    if (!local && cloud) {
        return { snapshot: cloud, source: 'cloud' };
    }

    if (local && !cloud) {
        if (cloudUpdatedAt && cloudMs > localMs) {
            return { snapshot: null, source: 'cloud' };
        }
        return { snapshot: local, source: 'local' };
    }

    if (cloudMs > localMs) {
        return { snapshot: cloud, source: 'cloud' };
    }

    if (localMs > cloudMs) {
        return { snapshot: local, source: 'local' };
    }

    return { snapshot: local, source: 'local' };
}

/**
 * @param {object | null} localSnapshot
 * @param {string | null | undefined} localClearedAt
 * @param {{ snapshot: object | null, updatedAt: string | null } | null} remote
 * @param {number} [nowMs]
 */
export function shouldPushLocalTrainingPlan(
    localSnapshot,
    localClearedAt,
    remote,
    nowMs = Date.now(),
) {
    const local = normalizeTrainingPlanSnapshot(localSnapshot);
    const localTs = localTrainingPlanTimestamp(local, localClearedAt);
    const localMs = Date.parse(localTs || '') || 0;

    if (!local) {
        if (!remote?.snapshot) return false;
        const remoteMs = Date.parse(remote.updatedAt || remote.snapshot?.updatedAt || '') || 0;
        return localMs > 0 && localMs >= remoteMs;
    }

    const remoteSnapshot = normalizeCloudTrainingPlan(remote?.snapshot);
    const remoteMs = Date.parse(remoteSnapshot?.updatedAt || remote?.updatedAt || '') || 0;

    if (!remoteSnapshot) {
        return localMs > 0;
    }

    if (localMs > 0 && (nowMs - localMs) < TRAINING_PLAN_LOCAL_GRACE_MS) {
        return localMs >= remoteMs;
    }

    return localMs >= remoteMs;
}

/**
 * @param {object | null} localSnapshot
 * @param {string | null | undefined} localClearedAt
 * @param {{ snapshot: object | null, updatedAt: string | null } | null} remote
 * @param {number} [nowMs]
 */
export function shouldApplyRemoteTrainingPlan(
    localSnapshot,
    localClearedAt,
    remote,
    nowMs = Date.now(),
) {
    const localTs = localTrainingPlanTimestamp(
        normalizeTrainingPlanSnapshot(localSnapshot),
        localClearedAt,
    );
    const localMs = Date.parse(localTs || '') || 0;

    if (localMs > 0 && (nowMs - localMs) < TRAINING_PLAN_LOCAL_GRACE_MS) {
        return false;
    }

    const resolved = resolveTrainingPlanOnSync(
        localSnapshot,
        localClearedAt,
        remote?.snapshot ?? null,
        remote?.updatedAt ?? null,
    );
    return resolved.source === 'cloud';
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 * @param {object | null} snapshot — null clears the cloud goal
 */
export async function syncTrainingPlanToFirestore(db, uid, snapshot) {
    if (!db || !uid) {
        return { ok: false, reason: 'no-auth' };
    }

    const normalized = snapshot ? normalizeTrainingPlanSnapshot({
        ...snapshot,
        updatedAt: snapshot.updatedAt || new Date().toISOString(),
    }) : null;

    const updatedAt = normalized?.updatedAt || new Date().toISOString();

    try {
        await setDoc(
            doc(db, 'settings', trainingPlanSettingsDocId(uid)),
            {
                trainingPlanSnapshot: normalized,
                trainingPlanUpdatedAt: updatedAt,
            },
            { merge: true },
        );
        return { ok: true, updatedAt, snapshot: normalized };
    } catch (err) {
        console.warn('[Training goal] Could not sync to Firestore:', err);
        return { ok: false, reason: err?.message || 'write-failed' };
    }
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 */
export async function fetchTrainingPlanFromFirestore(db, uid) {
    if (!db || !uid) return null;

    const docSnap = await getDoc(doc(db, 'settings', trainingPlanSettingsDocId(uid)));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    const snapshot = normalizeCloudTrainingPlan(data?.trainingPlanSnapshot);
    return {
        snapshot,
        updatedAt: data?.trainingPlanUpdatedAt || snapshot?.updatedAt || null,
    };
}
