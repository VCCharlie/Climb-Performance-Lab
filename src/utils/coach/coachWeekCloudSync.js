/**
 * Firestore persistence for coach week state (cross-device when signed in).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { normalizeCoachWeekState } from './coachWeekState';

export const COACH_WEEK_CLOUD_DEBOUNCE_MS = 1500;

/**
 * @param {string} uid
 */
export function coachWeekSettingsDocId(uid) {
    return `user_${uid}`;
}

/**
 * Last-write-wins merge for the current ISO week.
 * @param {object | null} localRaw — raw localStorage payload
 * @param {object | null | undefined} cloudState
 * @param {string} currentWeekKey
 */
export function resolveCoachWeekOnSync(localRaw, cloudState, currentWeekKey) {
    const localValid = localRaw?.weekKey === currentWeekKey
        ? normalizeCoachWeekState(localRaw)
        : normalizeCoachWeekState({ weekKey: currentWeekKey });

    const cloudValid = cloudState?.weekKey === currentWeekKey
        ? normalizeCoachWeekState(cloudState)
        : null;

    if (!cloudValid) {
        return { state: localValid, source: 'local' };
    }

    if (!localRaw || localRaw.weekKey !== currentWeekKey) {
        return { state: cloudValid, source: 'cloud' };
    }

    const localMs = Date.parse(localValid.updatedAt || '') || 0;
    const cloudMs = Date.parse(cloudValid.updatedAt || '') || 0;

    if (cloudMs > localMs) {
        return { state: cloudValid, source: 'cloud' };
    }

    return { state: localValid, source: 'local' };
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 * @param {object} coachWeekState
 */
export async function syncCoachWeekToFirestore(db, uid, coachWeekState) {
    if (!db || !uid) {
        return { ok: false, reason: 'no-auth' };
    }

    const stamped = normalizeCoachWeekState({
        ...coachWeekState,
        updatedAt: coachWeekState.updatedAt || new Date().toISOString(),
    });

    try {
        await setDoc(
            doc(db, 'settings', coachWeekSettingsDocId(uid)),
            {
                coachWeekState: stamped,
                coachWeekStateUpdatedAt: stamped.updatedAt,
            },
            { merge: true },
        );
        return { ok: true, updatedAt: stamped.updatedAt };
    } catch (err) {
        console.warn('[Coach week] Could not sync to Firestore:', err);
        return { ok: false, reason: err?.message || 'write-failed' };
    }
}

/**
 * @param {import('firebase/firestore').Firestore | null | undefined} db
 * @param {string | null | undefined} uid
 */
export async function fetchCoachWeekFromFirestore(db, uid) {
    if (!db || !uid) return null;

    const docSnap = await getDoc(doc(db, 'settings', coachWeekSettingsDocId(uid)));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    if (!data?.coachWeekState) return null;

    const state = normalizeCoachWeekState(data.coachWeekState);
    return {
        state,
        updatedAt: data.coachWeekStateUpdatedAt || state.updatedAt || null,
    };
}
