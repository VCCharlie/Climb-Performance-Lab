/**
 * Firestore batched writes (Bolt Phase 1.4).
 * Replaces N parallel setDoc calls with ⌈N/500⌉ batch commits.
 */

import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

/** Firestore limit per batch commit. */
export const FIRESTORE_MAX_BATCH_SIZE = 500;

/**
 * @param {string} collectionName
 * @param {Array<{ id: string | number, data: object }>} entries
 * @param {{ merge?: boolean }} [options]
 * @returns {Promise<number>} Number of documents written
 */
export async function batchWriteDocuments(collectionName, entries, options = {}) {
    const { merge = true } = options;
    if (!db || !collectionName || !entries?.length) return 0;

    const normalized = entries.filter((entry) => entry?.id != null && entry?.data != null);
    if (!normalized.length) return 0;

    let written = 0;
    for (let offset = 0; offset < normalized.length; offset += FIRESTORE_MAX_BATCH_SIZE) {
        const slice = normalized.slice(offset, offset + FIRESTORE_MAX_BATCH_SIZE);
        const batch = writeBatch(db);
        for (const { id, data } of slice) {
            const ref = doc(db, collectionName, String(id));
            if (merge) {
                batch.set(ref, data, { merge: true });
            } else {
                batch.set(ref, data);
            }
        }
        await batch.commit();
        written += slice.length;
    }

    return written;
}

/**
 * Merge-write activity documents (full activity objects as payload).
 * @param {object[]} activities
 * @returns {Promise<number>}
 */
export async function batchMergeWriteActivities(activities) {
    if (!activities?.length) return 0;
    const entries = activities
        .filter((act) => act?.id != null)
        .map((act) => ({ id: act.id, data: act }));
    return batchWriteDocuments('activities', entries, { merge: true });
}
