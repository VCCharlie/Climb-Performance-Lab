/**
 * Canonical bucket list state: climbStatus map + optional climb PBs.
 * Migrates legacy { done: [], planned: [], want: [] } from early ClimbMap.
 */

export const BUCKET_STATUSES = ['done', 'planned', 'want'];

/**
 * @returns {{ climbStatus: Record<string, string>, climbPbs: Record<string, object> }}
 */
export function defaultBucketListState() {
    return { climbStatus: {}, climbPbs: {}, updatedAt: null };
}

/**
 * @param {unknown} raw
 * @returns {{ climbStatus: Record<string, string>, climbPbs: Record<string, object> }}
 */
export function migrateLegacyBucketState(raw) {
    if (!raw || typeof raw !== 'object') return defaultBucketListState();

    const climbPbs = raw.climbPbs && typeof raw.climbPbs === 'object'
        ? { ...raw.climbPbs }
        : {};

    const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt.trim()
        : null;

    if (raw.climbStatus && typeof raw.climbStatus === 'object') {
        return { climbStatus: { ...raw.climbStatus }, climbPbs, updatedAt };
    }

    const climbStatus = {};
    for (const status of BUCKET_STATUSES) {
        const ids = raw[status];
        if (!Array.isArray(ids)) continue;
        for (const id of ids) {
            if (id != null && id !== '') climbStatus[String(id)] = status;
        }
    }

    return { climbStatus, climbPbs, updatedAt };
}

/**
 * @param {object} state
 * @param {'done'|'planned'|'want'} status
 * @returns {string[]}
 */
export function idsByStatus(state, status) {
    const out = [];
    const map = state?.climbStatus || {};
    for (const [id, s] of Object.entries(map)) {
        if (s === status) out.push(id);
    }
    return out;
}

/**
 * @param {object} state
 * @param {string} climbId
 * @param {'done'|'planned'|'want'} status
 */
export function hasBucketStatus(state, climbId, status) {
    return state?.climbStatus?.[String(climbId)] === status;
}

/**
 * Toggle or set bucket status for one climb.
 * @param {object} state
 * @param {string} climbId
 * @param {'done'|'planned'|'want'} status
 * @param {{ toggle?: boolean }} [opts]
 */
export function setClimbBucketStatus(state, climbId, status, { toggle = true } = {}) {
    const id = String(climbId);
    const climbStatus = { ...(state?.climbStatus || {}) };
    if (toggle && climbStatus[id] === status) {
        delete climbStatus[id];
    } else {
        climbStatus[id] = status;
    }
    return {
        climbStatus,
        climbPbs: state?.climbPbs || {},
    };
}

/**
 * @param {object} state
 * @param {object[]} climbs
 * @param {'done'|'planned'|'want'} status
 */
export function climbsByStatus(state, climbs, status) {
    const ids = new Set(idsByStatus(state, status));
    return (climbs || []).filter((c) => ids.has(String(c.id)));
}

/**
 * @param {object} state
 * @param {Record<string, object>} climbPbs
 */
export function mergeClimbPbs(state, climbPbs) {
    return {
        climbStatus: state?.climbStatus || {},
        climbPbs: { ...(state?.climbPbs || {}), ...(climbPbs || {}) },
    };
}
