import { protectEnrichedFieldsOnMerge } from './firestoreActivityMerge';

/**
 * Build the activity list after import/sync merges (for duplicate detection).
 * @param {Array} existingActivities
 * @param {Array} incomingActivities
 * @param {Array<string|number>} [idsToDelete]
 * @returns {Array}
 */
export function buildPostImportActivityList(existingActivities, incomingActivities, idsToDelete = []) {
    const removeSet = new Set((idsToDelete || []).map(String));
    const byId = new Map();

    for (const activity of existingActivities || []) {
        if (activity?.id == null) continue;
        if (removeSet.has(String(activity.id))) continue;
        byId.set(String(activity.id), activity);
    }

    for (const activity of incomingActivities || []) {
        if (activity?.id == null) continue;
        const strId = String(activity.id);
        const existing = byId.get(strId);
        byId.set(strId, existing ? protectEnrichedFieldsOnMerge(activity, existing) : activity);
    }

    return [...byId.values()];
}
