/**
 * Prev/next navigation within the activity detail modal (matches log order).
 */

/**
 * @param {string | number | null | undefined} activityId
 * @param {string[]} orderedIds
 * @returns {{ index: number, total: number, prevId: string | null, nextId: string | null }}
 */
export function getActivityDetailNavSlice(activityId, orderedIds) {
    const ids = Array.isArray(orderedIds) ? orderedIds.filter(Boolean) : [];
    const total = ids.length;
    if (!activityId || total === 0) {
        return { index: -1, total: 0, prevId: null, nextId: null };
    }
    const current = String(activityId);
    const index = ids.indexOf(current);
    if (index < 0) {
        return { index: -1, total, prevId: null, nextId: null };
    }
    return {
        index,
        total,
        prevId: index > 0 ? ids[index - 1] : null,
        nextId: index < total - 1 ? ids[index + 1] : null,
    };
}

/**
 * @param {string | null | undefined} id
 * @param {object[]} activities
 * @returns {object | null}
 */
export function findActivityByIdInList(id, activities) {
    if (id == null || !Array.isArray(activities)) return null;
    const key = String(id);
    return activities.find((a) => a?.id != null && String(a.id) === key) ?? null;
}
