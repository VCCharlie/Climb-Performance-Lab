/**
 * Persisted queue of site activities that still need Strava enrich after 429 / partial failure.
 */

import { safeLocalStorageSet } from './safeStorage.js';
import { activityLikelyNeedsStravaTitle } from './stravaTitleHeuristics.js';

export const STRAVA_ENRICH_PENDING_STORAGE_KEY = 'cpl.stravaEnrich.pending.v1';

const MAX_ENTRIES = 200;

/**
 * @typedef {object} StravaEnrichPendingEntry
 * @property {string} activityId
 * @property {string} [date] ISO date prefix
 * @property {string} [title]
 * @property {'rate_limit' | 'partial' | 'failed'} reason
 * @property {string} addedAt ISO timestamp
 * @property {number} attempts
 */

/**
 * @returns {StravaEnrichPendingEntry[]}
 */
export function readStravaEnrichPendingQueue() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STRAVA_ENRICH_PENDING_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((e) => e && e.activityId)
            .map((e) => ({
                activityId: String(e.activityId),
                date: e.date ? String(e.date).slice(0, 10) : undefined,
                title: e.title ? String(e.title) : undefined,
                reason: e.reason === 'partial' || e.reason === 'failed' ? e.reason : 'rate_limit',
                addedAt: e.addedAt || new Date().toISOString(),
                attempts: Number(e.attempts) || 0,
            }));
    } catch {
        return [];
    }
}

function writeQueue(entries) {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    safeLocalStorageSet(STRAVA_ENRICH_PENDING_STORAGE_KEY, JSON.stringify(trimmed));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cpl-strava-enrich-pending-updated'));
    }
    return trimmed;
}

/**
 * @param {StravaEnrichPendingEntry[]} newEntries
 */
export function enqueueStravaEnrichPending(newEntries) {
    if (!newEntries?.length) return readStravaEnrichPendingQueue();
    const byId = new Map(readStravaEnrichPendingQueue().map((e) => [e.activityId, e]));
    for (const entry of newEntries) {
        const id = String(entry.activityId);
        const prev = byId.get(id);
        byId.set(id, {
            activityId: id,
            date: entry.date ?? prev?.date,
            title: entry.title ?? prev?.title,
            reason: entry.reason || prev?.reason || 'rate_limit',
            addedAt: prev?.addedAt || entry.addedAt || new Date().toISOString(),
            attempts: (prev?.attempts || 0) + (entry.attemptsIncrement || 1),
        });
    }
    return writeQueue([...byId.values()]);
}

/**
 * @param {string[]} activityIds
 */
export function removeStravaEnrichPendingIds(activityIds) {
    if (!activityIds?.length) return readStravaEnrichPendingQueue();
    const drop = new Set(activityIds.map(String));
    return writeQueue(readStravaEnrichPendingQueue().filter((e) => !drop.has(e.activityId)));
}

/**
 * @param {object[]} requestedActivities
 * @param {{
 *   updates?: { id: string | number }[],
 *   rateLimitedActivityIds?: string[],
 *   failed?: number,
 *   rateLimitHits?: number,
 * }} result
 * @returns {StravaEnrichPendingEntry[]}
 */
export function recordStravaEnrichPendingFromResult(requestedActivities, result) {
    const updatedIds = new Set((result.updates || []).map((u) => String(u.id)));
    if (updatedIds.size > 0) {
        removeStravaEnrichPendingIds([...updatedIds]);
    }

    const rateLimited = new Set((result.rateLimitedActivityIds || []).map(String));
    const failedIds = new Set((result.failedActivityIds || []).map(String));
    if (rateLimited.size === 0 && failedIds.size === 0 && !(result.failed > 0)) {
        return readStravaEnrichPendingQueue();
    }

    const byId = new Map((requestedActivities || []).map((a) => [String(a.id), a]));
    /** @type {StravaEnrichPendingEntry[]} */
    const toEnqueue = [];

    const pendingIds = new Set([...rateLimited, ...failedIds]);
    for (const id of pendingIds) {
        if (updatedIds.has(id)) continue;
        const act = byId.get(id);
        toEnqueue.push({
            activityId: id,
            date: act?.date ? String(act.date).split('T')[0] : undefined,
            title: act?.title ? String(act.title) : undefined,
            reason: rateLimited.has(id) ? 'rate_limit' : 'failed',
            addedAt: new Date().toISOString(),
            attempts: 0,
        });
    }

    if (toEnqueue.length === 0) return readStravaEnrichPendingQueue();
    return enqueueStravaEnrichPending(toEnqueue.map((e) => ({ ...e, attemptsIncrement: 1 })));
}

/**
 * @param {object[]} activities full log
 * @param {StravaEnrichPendingEntry[]} [queue]
 * @returns {object[]}
 */
export function resolveActivitiesForPendingQueue(activities, queue = readStravaEnrichPendingQueue()) {
    const byId = new Map((activities || []).map((a) => [String(a.id), a]));
    return queue
        .map((e) => byId.get(e.activityId))
        .filter(Boolean);
}

/**
 * @param {StravaEnrichPendingEntry[]} queue
 * @param {number} [limit]
 * @returns {string} English user-facing summary
 */
export function formatStravaEnrichPendingSummary(queue, limit = 3) {
    if (!queue?.length) return '';
    const names = queue.slice(0, limit).map((e) => {
        const label = (e.title || '').trim() || e.date || e.activityId;
        return label;
    });
    const extra = queue.length > limit ? ` and ${queue.length - limit} more` : '';
    return `${queue.length} ride(s) still need Strava details (${names.join(', ')}${extra}). Wait about 15 minutes, then use Retry pending.`;
}

/**
 * @param {object} act
 * @param {string[]} [deviceProfileTitles]
 * @returns {boolean}
 */
export function activityStillNeedsStravaEnrich(act, deviceProfileTitles = []) {
    if (!act?.id) return false;
    const missingHr = !act.avg_hr || act.avg_hr === 0;
    const missingRpe = !act.rpe || act.rpe === 0;
    const missingStravaId = !act.strava_id;
    const missingMap = !act.strava_map || String(act.strava_map).trim() === '';
    const missingGear = act.strava_id && !act.gear_id;
    const needsTitle = activityLikelyNeedsStravaTitle(act, deviceProfileTitles);
    return missingHr || missingRpe || missingStravaId || missingMap || missingGear || needsTitle;
}

/**
 * @param {{
 *   pendingCount?: number,
 *   rateLimitHits?: number,
 *   partialSaved?: boolean,
 * }} params
 * @returns {string}
 */
export function formatStravaEnrichRetryGuidance(params = {}) {
    const count = Math.max(0, Number(params.pendingCount) || 0);
    const hits = Math.max(0, Number(params.rateLimitHits) || 0);
    const parts = [];
    if (params.partialSaved) {
        parts.push('Some Strava fields were saved; others are still missing.');
    }
    if (hits > 0) {
        parts.push('Strava rate limit (429). Wait about 15 minutes, then use Retry pending in the Strava panel.');
    } else if (count > 0) {
        parts.push('Some activities could not be fully enriched.');
    }
    if (count > 0) {
        parts.push(`${count} ride(s) are queued under Link to Strava → Pending enrich.`);
    }
    return parts.join(' ') || formatStravaEnrichPendingSummary(readStravaEnrichPendingQueue());
}

/**
 * @param {object[]} attemptedActivities
 * @param {object} result
 * @param {string[]} [deviceProfileTitles]
 * @returns {StravaEnrichPendingEntry[]}
 */
export function reconcileStravaEnrichPendingQueue(attemptedActivities, result, deviceProfileTitles = []) {
    recordStravaEnrichPendingFromResult(attemptedActivities, result);

    const mergedById = new Map(
        (result.mergedActivities || attemptedActivities || []).map((a) => [String(a.id), a]),
    );
    const partialEntries = [];
    for (const act of attemptedActivities || []) {
        const id = String(act.id);
        const merged = mergedById.get(id) || act;
        if (activityStillNeedsStravaEnrich(merged, deviceProfileTitles)) {
            partialEntries.push({
                activityId: id,
                date: String(merged.date || act.date || '').split('T')[0],
                title: String(merged.title || act.title || 'Activity'),
                reason: (result.rateLimitHits || 0) > 0 ? 'rate_limit' : 'partial',
                addedAt: new Date().toISOString(),
                attempts: 0,
            });
        }
    }
    if (partialEntries.length > 0) {
        enqueueStravaEnrichPending(partialEntries.map((e) => ({ ...e, attemptsIncrement: 0 })));
    }

    const completeIds = (attemptedActivities || [])
        .map((a) => String(a.id))
        .filter((id) => {
            const merged = mergedById.get(id);
            return merged && !activityStillNeedsStravaEnrich(merged, deviceProfileTitles);
        });
    if (completeIds.length > 0) {
        removeStravaEnrichPendingIds(completeIds);
    }
    return readStravaEnrichPendingQueue();
}

/** @param {StravaEnrichPendingEntry[]} entries */
export function writeStravaEnrichPendingQueue(entries) {
    writeQueue(entries || []);
    return readStravaEnrichPendingQueue();
}

/** @param {string} activityId */
export function removeStravaEnrichPendingByIds(activityIds) {
    return removeStravaEnrichPendingIds(activityIds);
}
