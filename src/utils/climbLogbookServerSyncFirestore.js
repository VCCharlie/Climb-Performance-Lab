/**
 * Queue climb logbook server jobs via Firestore (server worker reads settings doc).
 */

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { bucketListSettingsDocId } from './bucketListCloudSync.js';
import { newClimbLogbookRequestId } from './climbLogbookServerSync.js';

/**
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid
 * @param {{ startDate: string, endDate: string, routeSource: import('./climbLogbookRouteSource.js').ClimbLogbookRouteSource }} params
 */
export async function queueClimbLogbookServerSync(db, uid, params) {
    if (!db || !uid) {
        throw new Error('Sign in to queue a server climb logbook run.');
    }
    const requestId = newClimbLogbookRequestId();
    const requestedAt = new Date().toISOString();
    const docRef = doc(db, 'settings', bucketListSettingsDocId(uid));

    await setDoc(
        docRef,
        {
            climbLogbookSyncRequest: {
                startDate: params.startDate,
                endDate: params.endDate,
                routeSource: params.routeSource,
                requestId,
                requestedAt,
            },
            climbLogbookSync: {
                state: 'queued',
                routeSource: params.routeSource,
                jobStartDate: params.startDate,
                jobEndDate: params.endDate,
                message: 'Queued — waiting for server worker.',
                updatedAt: requestedAt,
            },
        },
        { merge: true },
    );

    return { requestId, requestedAt };
}

/**
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid
 * @param {(status: import('./climbLogbookServerSync.js').ClimbLogbookSyncStatus | null) => void} onStatus
 * @returns {() => void}
 */
export function subscribeClimbLogbookServerSyncStatus(db, uid, onStatus) {
    if (!db || !uid) {
        onStatus(null);
        return () => {};
    }
    const docRef = doc(db, 'settings', bucketListSettingsDocId(uid));
    return onSnapshot(
        docRef,
        (snap) => {
            const data = snap.exists() ? snap.data() : null;
            onStatus(data?.climbLogbookSync ?? null);
        },
        () => {
            onStatus(null);
        },
    );
}
