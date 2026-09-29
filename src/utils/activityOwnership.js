/**
 * Single-owner activity documents: stamp Firebase Auth uid on Firestore writes.
 */
import { auth } from '../firebase.js';

export const ACTIVITY_OWNER_FIELD = 'ownerId';

/**
 * @param {string | null | undefined} explicitUid
 * @returns {string | null}
 */
export function resolveOwnerUid(explicitUid) {
    if (explicitUid) return String(explicitUid);
    try {
        const uid = auth?.currentUser?.uid;
        return uid ? String(uid) : null;
    } catch {
        return null;
    }
}

/**
 * @param {object | null | undefined} activity
 * @param {string | null | undefined} uid
 * @returns {boolean}
 */
export function isActivityVisibleToUser(activity, uid) {
    if (!uid) return true;
    const ownerId = activity?.[ACTIVITY_OWNER_FIELD];
    if (!ownerId) return true;
    return String(ownerId) === String(uid);
}

/**
 * @param {object | null | undefined} activity
 * @param {string | null | undefined} uid
 * @returns {boolean}
 */
export function activityNeedsOwnerBackfill(activity, uid) {
    if (!uid || !activity || activity.id == null) return false;
    return !activity[ACTIVITY_OWNER_FIELD];
}

/**
 * Ensure Firestore payload carries ownerId for rules + future multi-tenant safety.
 *
 * @param {object} payload
 * @param {string | null | undefined} ownerUid
 * @param {object | null | undefined} existingActivity
 * @returns {object}
 */
export function stampActivityOwnerId(payload, ownerUid, existingActivity = null) {
    if (!payload || typeof payload !== 'object') return payload;
    const uid = resolveOwnerUid(ownerUid);
    if (!uid) return payload;

    const existingOwner = existingActivity?.[ACTIVITY_OWNER_FIELD];
    if (existingOwner && String(existingOwner) !== uid) {
        return { ...payload, [ACTIVITY_OWNER_FIELD]: existingOwner };
    }

    return { ...payload, [ACTIVITY_OWNER_FIELD]: uid };
}

/**
 * Derive owner uid from a Firestore settings doc id (`user_{uid}`).
 *
 * @param {string | null | undefined} settingsDocId
 * @returns {string | null}
 */
export function ownerUidFromSettingsDocId(settingsDocId) {
    const id = (settingsDocId || '').trim();
    if (!id.startsWith('user_') || id.length <= 'user_'.length) return null;
    const uid = id.slice('user_'.length);
    if (!uid || uid === 'prefs') return null;
    return uid;
}
