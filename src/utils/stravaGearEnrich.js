/**
 * After linking strava_id, fill gear_id / gear_name (and optional map) from Strava API.
 */

import { stripUndefinedFields } from './mergeActivities';
import { normalizeStravaActivityId } from './strava';
import { runInBatches } from './async';
import { parseDurationToSeconds } from './formatters';

function storedMovingTimeSec(act) {
    const t = act?.moving_time;
    if (t == null || t === '') return 0;
    if (typeof t === 'number' && !Number.isNaN(t) && t > 0) return Math.floor(t);
    const s = parseDurationToSeconds(String(t));
    return s > 0 ? s : 0;
}

export { normalizeStravaActivityId } from './strava';

/**
 * @param {string} stravaActivityId - numeric id
 * @param {string} token
 * @returns {Promise<string | null>} gear_id
 */
export async function fetchGearIdFromStravaActivityDetail(stravaActivityId, token) {
    if (!stravaActivityId || !token) return null;
    try {
        const resp = await fetch(
            `https://www.strava.com/api/v3/activities/${encodeURIComponent(stravaActivityId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) return null;
        const detail = await resp.json();
        const gid = detail?.gear_id;
        return gid != null ? String(gid) : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} gearId
 * @param {string} token
 * @returns {Promise<string | null>}
 */
export async function fetchStravaGearName(gearId, token) {
    if (!gearId || !token) return null;
    try {
        const r = await fetch(`https://www.strava.com/api/v3/gear/${encodeURIComponent(gearId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return null;
        const g = await r.json();
        return g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Bike';
    } catch {
        return null;
    }
}

/**
 * @param {object} merged - Activity after merge (must have strava_id)
 * @param {object | null} stravaSide - Duplicate row (may have gear_id from list API)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function enrichActivityGearFromStrava(merged, stravaSide, token) {
    if (!merged || !token || !merged.strava_id) return stripUndefinedFields({ ...merged });

    let out = { ...merged };
    const stravaActId = normalizeStravaActivityId(merged.strava_id);
    if (!stravaActId) return stripUndefinedFields({ ...merged });

    const needsDetail =
        !out.gear_id
        || !out.strava_map
        || (!(out.gear_name != null && String(out.gear_name).trim()))
        || storedMovingTimeSec(out) <= 0;

    let detail = null;
    if (needsDetail) {
        try {
            const resp = await fetch(`https://www.strava.com/api/v3/activities/${encodeURIComponent(stravaActId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.ok) {
                detail = await resp.json();
            }
        } catch {
            /* offline / rate limit */
        }
    }

    let gearId = out.gear_id || stravaSide?.gear_id || detail?.gear_id || null;
    if (gearId) gearId = String(gearId);

    let gearName =
        (out.gear_name != null && String(out.gear_name).trim() !== '')
            ? String(out.gear_name).trim()
            : (stravaSide?.gear_name != null && String(stravaSide.gear_name).trim() !== '')
                ? String(stravaSide.gear_name).trim()
                : null;

    if (gearId && !gearName) {
        try {
            const bikesMap = JSON.parse(localStorage.getItem('stravaBikesMap') || '{}');
            if (bikesMap[gearId]) gearName = String(bikesMap[gearId]);
        } catch {
            /* ignore */
        }
    }

    if (gearId && !gearName) {
        gearName = await fetchStravaGearName(gearId, token);
    }

    if (gearId) {
        out.gear_id = gearId;
        if (gearName) {
            out.gear_name = gearName;
            try {
                const bikesMap = JSON.parse(localStorage.getItem('stravaBikesMap') || '{}');
                bikesMap[gearId] = gearName;
                localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap));
            } catch {
                /* quota */
            }
        } else {
            delete out.gear_name;
        }
    }

    if (!out.strava_map && detail?.map?.summary_polyline) {
        out.strava_map = detail.map.summary_polyline;
    }

    // Strava API: moving_time / elapsed_time in seconds — fill when site still has 0 / unparsed
    if (detail && storedMovingTimeSec(out) <= 0) {
        const mv = Number(detail.moving_time);
        const el = Number(detail.elapsed_time);
        const sec = (!Number.isNaN(mv) && mv > 0)
            ? Math.floor(mv)
            : (!Number.isNaN(el) && el > 0 ? Math.floor(el) : 0);
        if (sec > 0) out.moving_time = sec;
    }

    out.strava_id = stravaActId;

    return stripUndefinedFields(out);
}

/**
 * Same Strava detail fetch as merge pair / Find-link: for each row with strava_id,
 * GET /activities/:id and return merge patches (gear, strava_map, normalized strava_id).
 *
 * @param {object[]} siteActivities
 * @param {string} token
 * @param {{ concurrency?: number, onProgress?: (msg: string) => void }} [opts]
 * @returns {Promise<{ updates: { id: string | number, data: object }[], ridesProcessed: number, unchanged: number, failed: number }>}
 */
export async function buildStravaDetailEnrichmentUpdates(siteActivities, token, opts = {}) {
    const conc = Math.max(1, Math.min(5, opts.concurrency ?? 3));
    const list = (siteActivities || []).filter((a) => a?.id != null && a?.strava_id);
    if (!token || list.length === 0) {
        return { updates: [], ridesProcessed: 0, unchanged: 0, failed: 0 };
    }

    opts.onProgress?.(`Strava activity details: ${list.length} ride(s)…`);

    const updates = [];
    let unchanged = 0;
    let failed = 0;

    await runInBatches(list, conc, async (act) => {
        try {
            const enriched = await enrichActivityGearFromStrava(act, null, token);
            const sid = enriched.strava_id || normalizeStravaActivityId(act.strava_id);
            const timeChanged =
                storedMovingTimeSec(act) !== storedMovingTimeSec(enriched)
                && storedMovingTimeSec(enriched) > 0;
            const patch = stripUndefinedFields({
                ...(sid ? { strava_id: sid } : {}),
                ...(enriched.gear_id != null ? { gear_id: enriched.gear_id } : {}),
                ...(enriched.gear_name != null && String(enriched.gear_name).trim()
                    ? { gear_name: enriched.gear_name }
                    : {}),
                ...(enriched.strava_map != null && String(enriched.strava_map).trim()
                    ? { strava_map: enriched.strava_map }
                    : {}),
                ...(timeChanged ? { moving_time: enriched.moving_time } : {}),
            });
            const same =
                String(normalizeStravaActivityId(act.strava_id) || act.strava_id || '') === String(patch.strava_id || '')
                && String(act.gear_id ?? '') === String(patch.gear_id ?? '')
                && String(act.gear_name ?? '').trim() === String(patch.gear_name ?? '').trim()
                && String(act.strava_map ?? '') === String(patch.strava_map ?? '')
                && !timeChanged;
            if (same || Object.keys(patch).length === 0) {
                unchanged += 1;
                return;
            }
            updates.push({ id: act.id, data: patch });
        } catch {
            failed += 1;
        }
    });

    return {
        updates,
        ridesProcessed: list.length,
        unchanged,
        failed,
    };
}
