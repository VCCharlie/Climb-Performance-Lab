import { protectEnrichedFieldsOnMerge } from './firestoreActivityMerge';

function activityIdKey(activity) {
    if (!activity || activity.id == null) return null;
    return String(activity.id);
}

export function prepareProtectedActivityUpserts(existingActivities = [], incomingActivities = []) {
    const existingById = new Map();

    (existingActivities || []).forEach((activity) => {
        const key = activityIdKey(activity);
        if (key) existingById.set(key, activity);
    });

    return (incomingActivities || [])
        .filter((activity) => activityIdKey(activity))
        .map((activity) => {
            const existing = existingById.get(String(activity.id));
            if (!existing) return activity;

            const protectedActivity = protectEnrichedFieldsOnMerge(activity, existing);
            return { ...existing, ...protectedActivity };
        });
}

export function prepareProtectedActivityUpsertsFromCurrent(getExistingActivities, incomingActivities = []) {
    const existingActivities = typeof getExistingActivities === 'function' ? getExistingActivities() : [];
    return prepareProtectedActivityUpserts(existingActivities, incomingActivities);
}

export function mergeActivitiesPreservingEnrichment(existingActivities = [], incomingActivities = []) {
    const mergedById = new Map();

    const upsert = (activity) => {
        const key = activityIdKey(activity);
        if (!key) return;

        const existing = mergedById.get(key);
        if (!existing) {
            mergedById.set(key, activity);
            return;
        }

        const protectedActivity = protectEnrichedFieldsOnMerge(activity, existing);
        mergedById.set(key, { ...existing, ...protectedActivity });
    };

    (existingActivities || []).forEach(upsert);
    (incomingActivities || []).forEach(upsert);

    return Array.from(mergedById.values());
}
