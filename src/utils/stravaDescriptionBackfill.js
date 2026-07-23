/**
 * Strava description-only backfill — one GET /activities/:id per ride, no segment efforts.
 * Used for climb PB matching (MyCols / ClimbFinder text in Strava description).
 */

import { runInBatches } from './async';
import { normalizeStravaActivityId } from './strava';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_PER_RUN = 80;

/**
 * @param {object} act
 */
export function activityNeedsStravaDescription(act) {
    if (!act?.strava_id) return false;
    if (act.strava_description_checked === true) return false;
    const desc = (act.description || act.notes || '').trim();
    return desc.length === 0;
}

/**
 * @param {object[]} siteActivities
 * @param {string[] | Set<string>} [onlyIds] - optional activity id allow-list (e.g. bulk selection)
 */
export function pickActivitiesNeedingStravaDescription(siteActivities, onlyIds = null) {
    const allow = onlyIds
        ? new Set([...onlyIds].map((id) => String(id)))
        : null;

    return (siteActivities || []).filter((act) => {
        if (!act?.id || !activityNeedsStravaDescription(act)) return false;
        if (allow && !allow.has(String(act.id))) return false;
        return true;
    });
}

/**
 * Lightweight detail fetch — description only (no include_all_efforts).
 * @param {string} stravaActivityId
 * @param {string} token
 */
export async function fetchStravaActivityDescription(stravaActivityId, token) {
    const sid = normalizeStravaActivityId(stravaActivityId);
    if (!sid || !token) return null;

    try {
        const resp = await fetch(
            `https://www.strava.com/api/v3/activities/${encodeURIComponent(sid)}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (resp.status === 429) {
            const err = new Error('Strava rate limit (429)');
            err.status = 429;
            throw err;
        }
        if (!resp.ok) return null;
        const detail = await resp.json();
        const text = detail?.description != null ? String(detail.description).trim() : '';
        return text || null;
    } catch (e) {
        if (e?.status === 429) throw e;
        return null;
    }
}

/**
 * @param {object[]} siteActivities
 * @param {string} token
 * @param {{
 *   concurrency?: number,
 *   maxPerRun?: number,
 *   onlyIds?: string[] | Set<string>,
 *   onProgress?: (msg: string) => void,
 * }} [opts]
 */
export async function buildStravaDescriptionBackfillUpdates(siteActivities, token, opts = {}) {
    const conc = Math.max(1, Math.min(4, opts.concurrency ?? DEFAULT_CONCURRENCY));
    const maxPerRun = Math.max(1, opts.maxPerRun ?? DEFAULT_MAX_PER_RUN);
    const candidates = pickActivitiesNeedingStravaDescription(siteActivities, opts.onlyIds);
    const sorted = [...candidates].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const batch = sorted.slice(0, maxPerRun);

    if (!token || batch.length === 0) {
        return {
            updates: [],
            candidates: candidates.length,
            processed: 0,
            filled: 0,
            emptyOnStrava: 0,
            failed: 0,
            rateLimitHits: 0,
            remaining: candidates.length,
        };
    }

    const updates = [];
    let filled = 0;
    let emptyOnStrava = 0;
    let failed = 0;
    let rateLimitHits = 0;

    opts.onProgress?.(`Strava descriptions: 0 / ${batch.length}…`);

    await runInBatches(batch, conc, async (act, index) => {
        try {
            const description = await fetchStravaActivityDescription(act.strava_id, token);
            const patch = { strava_description_checked: true };
            if (description) {
                patch.description = description;
                updates.push({ id: act.id, data: patch });
                filled += 1;
            } else {
                updates.push({ id: act.id, data: { ...patch, strava_description_empty: true } });
                emptyOnStrava += 1;
            }
        } catch (e) {
            if (e?.status === 429) {
                rateLimitHits += 1;
                failed += 1;
            } else {
                failed += 1;
            }
        }
        if ((index + 1) % 5 === 0 || index === batch.length - 1) {
            opts.onProgress?.(`Strava descriptions: ${index + 1} / ${batch.length}…`);
        }
    });

    return {
        updates,
        candidates: candidates.length,
        processed: batch.length,
        filled,
        emptyOnStrava,
        failed,
        rateLimitHits,
        remaining: Math.max(0, candidates.length - batch.length),
    };
}
