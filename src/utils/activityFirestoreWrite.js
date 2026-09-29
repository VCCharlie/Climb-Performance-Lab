/**
 * Prepare activity payloads for Firestore merge writes (enrichment + ownerId).
 */
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { protectEnrichedFieldsOnMerge } from './firestoreActivityMerge.js';
import { stampActivityOwnerId, resolveOwnerUid } from './activityOwnership.js';

/**
 * @param {object} incoming
 * @param {object | null | undefined} existing
 * @param {{ deviceProfileTitles?: string[], dataSourcePrefs?: object }} [mergeOpts]
 * @param {string | null | undefined} [ownerUid]
 * @returns {object}
 */
export function buildActivityFirestoreMergePayload(incoming, existing, mergeOpts = {}, ownerUid = null) {
    const merged = protectEnrichedFieldsOnMerge(incoming, existing, mergeOpts);
    return stampActivityOwnerId(merged, resolveOwnerUid(ownerUid), existing);
}

/**
 * @param {string | number} id
 * @param {object} payload
 * @param {{ existing?: object | null, mergeOpts?: object, ownerUid?: string | null }} [options]
 */
export async function mergeWriteActivityDocument(id, payload, options = {}) {
    if (!db || id == null) return;
    const { existing = null, mergeOpts = {}, ownerUid = null } = options;
    const data = existing
        ? buildActivityFirestoreMergePayload(payload, existing, mergeOpts, ownerUid)
        : stampActivityOwnerId(payload, resolveOwnerUid(ownerUid), existing);
    await setDoc(doc(db, 'activities', String(id)), data, { merge: true });
}
