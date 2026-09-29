/**
 * Browser ownerId helpers — adds Firebase Auth uid when not passed explicitly.
 */
import { auth } from '../firebase.js';
export {
    ACTIVITY_OWNER_FIELD,
    isActivityVisibleToUser,
    activityNeedsOwnerBackfill,
    stampActivityOwnerId,
    ownerUidFromSettingsDocId,
} from './activityOwnershipCore.js';

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
