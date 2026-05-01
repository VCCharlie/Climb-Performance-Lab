import { parseDurationToSeconds } from './formatters';
import { normalizeStravaActivityId } from './strava';

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

export function findSafeImportReplacementDuplicate(existingActivities = [], incomingActivity) {
    return existingActivities.find((existing) =>
        isSafeImportReplacementDuplicate(existing, incomingActivity)
    ) || null;
}
