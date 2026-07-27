/**
 * PB climbs the user explicitly removed — survives cloud merge and rescans.
 */

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeDismissedPbClimbIds(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();
    for (const id of raw) {
        if (id == null || id === '') continue;
        const key = String(id);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(key);
    }
    return out;
}

/**
 * @param {unknown} localIds
 * @param {unknown} cloudIds
 * @returns {string[]}
 */
export function unionDismissedPbClimbIds(localIds, cloudIds) {
    const set = new Set([
        ...normalizeDismissedPbClimbIds(localIds),
        ...normalizeDismissedPbClimbIds(cloudIds),
    ]);
    return [...set];
}

/**
 * @param {Record<string, object> | null | undefined} climbPbs
 * @param {string[]} dismissedIds
 * @returns {Record<string, object>}
 */
export function climbPbsWithoutDismissed(climbPbs, dismissedIds) {
    const dismissed = new Set(normalizeDismissedPbClimbIds(dismissedIds));
    if (dismissed.size === 0) return { ...(climbPbs || {}) };
    const next = { ...(climbPbs || {}) };
    for (const id of dismissed) {
        delete next[id];
    }
    return next;
}

/**
 * @param {string[]} dismissedIds
 * @param {string} climbId
 * @returns {string[]}
 */
export function addDismissedPbClimbId(dismissedIds, climbId) {
    const id = String(climbId);
    return unionDismissedPbClimbIds(dismissedIds, [id]);
}
