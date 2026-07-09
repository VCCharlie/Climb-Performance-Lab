import { parseDurationToSeconds } from './formatters';
import { normalizeStravaActivityId } from './strava';
import {
    isLikelyIntervalsActivityId,
    isStravaOnlyActivityId,
    mergeActivitiesIntervalsPrimary,
} from './mergeActivities';

export function movingTimeToSeconds(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !Number.isNaN(value)) return Math.max(0, Math.floor(value));
    return parseDurationToSeconds(String(value));
}

function dateKey(activity) {
    const raw = activity?.date;
    if (!raw) return null;
    return String(raw).split('T')[0] || null;
}

function compatibleActivityTypes(existingType, incomingType) {
    if (existingType === incomingType) return true;
    return existingType === 'Ride' || incomingType === 'Ride';
}

function hasMatchingStravaIdentity(existing, incoming) {
    const existingStravaId = normalizeStravaActivityId(existing?.strava_id);
    const incomingStravaId = normalizeStravaActivityId(incoming?.strava_id);
    if (!existingStravaId && !incomingStravaId) return false;
    return existingStravaId && incomingStravaId && existingStravaId === incomingStravaId;
}

export function isSafeImportReplacementDuplicate(existing, incoming) {
    if (!existing || !incoming) return false;
    if (existing.id === incoming.id) return false;
    if (dateKey(existing) !== dateKey(incoming)) return false;
    if (!compatibleActivityTypes(existing.type, incoming.type)) return false;
    if (!hasMatchingStravaIdentity(existing, incoming)) return false;

    const existingSeconds = movingTimeToSeconds(existing.moving_time);
    const incomingSeconds = movingTimeToSeconds(incoming.moving_time);
    if (existingSeconds <= 0 || incomingSeconds <= 0) return false;

    const existingDistance = Number(existing.distance) || 0;
    const incomingDistance = Number(incoming.distance) || 0;
    if (existingDistance <= 0 || incomingDistance <= 0) return false;

    const timeDiff = Math.abs(existingSeconds - incomingSeconds);
    const distDiff = Math.abs(existingDistance - incomingDistance);
    return timeDiff < 300 && distDiff < 0.5;
}

function canReplaceWithIncomingCanonical(existing, incoming) {
    return (
        isSafeImportReplacementDuplicate(existing, incoming)
        && isStravaOnlyActivityId(existing.id)
        && isLikelyIntervalsActivityId(incoming.id)
    );
}

function canMergeIntoExistingCanonical(existing, incoming) {
    return (
        isSafeImportReplacementDuplicate(existing, incoming)
        && isLikelyIntervalsActivityId(existing.id)
        && isStravaOnlyActivityId(incoming.id)
    );
}

// ⚡ Bolt Optimization: Accept a Map of candidates grouped by dateKey for O(1) lookups instead of O(N*M) array.find
function findCanonicalImportDuplicate(existingCandidatesByDate = new Map(), incomingActivity) {
    const dKey = dateKey(incomingActivity);
    if (!dKey) return null;

    const existingCandidates = existingCandidatesByDate.get(dKey);
    if (!existingCandidates || existingCandidates.length === 0) return null;

    return existingCandidates.find((existing) =>
        canReplaceWithIncomingCanonical(existing, incomingActivity)
        || canMergeIntoExistingCanonical(existing, incomingActivity)
    ) || null;
}

export function findSafeImportReplacementDuplicate(existingActivities = [], incomingActivity) {
    return existingActivities.find((existing) =>
        canReplaceWithIncomingCanonical(existing, incomingActivity)
    ) || null;
}

export function buildImportReplacementPlan(existingActivities = [], incomingActivities = []) {
    const existingById = new Map(
        (existingActivities || [])
            .filter((activity) => activity?.id != null)
            .map((activity) => [String(activity.id), activity])
    );

    // ⚡ Bolt Optimization: Group existing activities by dateKey to avoid O(N*M) lookups inside the loop
    const existingCandidatesByDate = new Map();
    (existingActivities || []).forEach((existing) => {
        if (!existing) return;
        const dKey = dateKey(existing);
        if (dKey) {
            let list = existingCandidatesByDate.get(dKey);
            if (!list) {
                list = [];
                existingCandidatesByDate.set(dKey, list);
            }
            list.push(existing);
        }
    });

    const idsToDelete = [];
    const idsMarkedForDelete = new Set();
    const activitiesToImport = [];
    let replacedCount = 0;

    const markForDelete = (id) => {
        if (id == null) return;
        const key = String(id);
        if (idsMarkedForDelete.has(key)) return;
        idsMarkedForDelete.add(key);
        idsToDelete.push(id);
    };

    (incomingActivities || []).forEach((incoming) => {
        const duplicate = findCanonicalImportDuplicate(existingCandidatesByDate, incoming);

        if (duplicate && canReplaceWithIncomingCanonical(duplicate, incoming)) {
            activitiesToImport.push(mergeActivitiesIntervalsPrimary(incoming, duplicate));
            markForDelete(duplicate.id);
            replacedCount += 1;
            return;
        }

        if (duplicate && canMergeIntoExistingCanonical(duplicate, incoming)) {
            activitiesToImport.push(mergeActivitiesIntervalsPrimary(duplicate, incoming));
            if (existingById.has(String(incoming.id))) {
                markForDelete(incoming.id);
            }
            replacedCount += 1;
            return;
        }

        activitiesToImport.push(incoming);
    });

    return { activitiesToImport, idsToDelete, replacedCount };
}
