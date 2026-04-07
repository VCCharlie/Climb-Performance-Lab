/**
 * Batch-fill gear_id / gear_name for site activities that have strava_id but no gear_id.
 * Strategy: paginate Strava athlete/activities (each item includes gear_id) — one list read
 * per page, not one detail call per ride. Then GET /gear/{id} only for unique bike ids.
 */

import { runInBatches } from './async';
import { fetchStravaGearName } from './stravaGearEnrich';
import { stripUndefinedFields } from './mergeActivities';

const STRAVA_LIST = 'https://www.strava.com/api/v3/athlete/activities';
const STRAVA_ATHLETE = 'https://www.strava.com/api/v3/athlete';

/**
 * @param {string} token
 * @param {{ maxPages?: number, onProgress?: (msg: string) => void }} [opts]
 * @returns {Promise<object[]>}
 */
export async function fetchStravaActivityListAllPages(token, opts = {}) {
    const maxPages = opts.maxPages ?? 100;
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
        opts.onProgress?.(`Strava list page ${page}…`);
        const r = await fetch(`${STRAVA_LIST}?per_page=200&page=${page}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) {
            const err = new Error(`Strava list error: ${r.status}`);
            err.status = r.status;
            throw err;
        }
        const batch = await r.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 200) break;
    }
    return all;
}

/**
 * @param {object[]} listActivities - Strava list API rows
 * @returns {Map<string, string>} strava activity id -> gear_id
 */
export function buildStravaActivityIdToGearIdMap(listActivities) {
    const m = new Map();
    for (const a of listActivities || []) {
        const aid = a?.id != null ? String(a.id) : '';
        const gid = a?.gear_id != null ? String(a.gear_id) : '';
        if (aid && gid) m.set(aid, gid);
    }
    return m;
}

/**
 * @param {object[]} siteActivities
 * @param {Map<string, string>} stravaIdToGearId
 * @returns {{ id: string | number, strava_id: string, gear_id: string }[]}
 */
export function pickActivitiesNeedingGearPatch(siteActivities, stravaIdToGearId) {
    const out = [];
    for (const act of siteActivities || []) {
        if (!act?.id || !act.strava_id) continue;
        if (act.gear_id) continue;
        const sid = String(act.strava_id);
        const gid = stravaIdToGearId.get(sid);
        if (gid) out.push({ id: act.id, strava_id: sid, gear_id: gid });
    }
    return out;
}

/**
 * @param {string} token
 * @returns {Promise<Record<string, string>>}
 */
export async function loadStravaBikesMapMerged(token) {
    const bikesMap = {};
    try {
        const raw = localStorage.getItem('stravaBikesMap');
        if (raw) Object.assign(bikesMap, JSON.parse(raw));
    } catch {
        /* ignore */
    }
    try {
        const athleteResp = await fetch(STRAVA_ATHLETE, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (athleteResp.ok) {
            const athleteData = await athleteResp.json();
            (athleteData.bikes || []).forEach((b) => {
                if (b.id) bikesMap[String(b.id)] = b.name || 'Bike';
            });
        }
    } catch {
        /* ignore */
    }
    return bikesMap;
}

/**
 * @param {object[]} siteActivities - full list from app
 * @param {string} token
 * @param {{ maxListPages?: number, onProgress?: (msg: string) => void, gearFetchConcurrency?: number }} [opts]
 * @returns {Promise<{ updates: { id: string | number, data: object }[], listActivitiesRead: number, matched: number, uniqueGearFetched: number }>}
 */
export async function buildGearBackfillUpdates(siteActivities, token, opts = {}) {
    const maxListPages = opts.maxListPages ?? 100;
    const conc = opts.gearFetchConcurrency ?? 5;

    const needCount = (siteActivities || []).filter((a) => a?.strava_id && !a.gear_id).length;
    if (needCount === 0) {
        return {
            updates: [],
            listActivitiesRead: 0,
            matched: 0,
            uniqueGearFetched: 0,
            needCount: 0,
            unmatchedNeed: 0,
        };
    }

    opts.onProgress?.('Loading Strava ride history for gear…');
    const list = await fetchStravaActivityListAllPages(token, {
        maxPages: maxListPages,
        onProgress: opts.onProgress,
    });

    const idToGear = buildStravaActivityIdToGearIdMap(list);
    const rows = pickActivitiesNeedingGearPatch(siteActivities, idToGear);
    if (rows.length === 0) {
        return {
            updates: [],
            listActivitiesRead: list.length,
            matched: 0,
            uniqueGearFetched: 0,
            needCount,
            unmatchedNeed: needCount,
        };
    }

    opts.onProgress?.('Resolving bike names…');
    const bikesMap = await loadStravaBikesMapMerged(token);
    const uniqueGearIds = [...new Set(rows.map((r) => r.gear_id))];
    const missing = uniqueGearIds.filter((gid) => !bikesMap[gid]);

    await runInBatches(missing, conc, async (gid) => {
        const name = await fetchStravaGearName(gid, token);
        if (name) bikesMap[gid] = name;
    });

    try {
        localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap));
    } catch {
        /* quota */
    }

    const updates = rows.map((r) => {
        const name = bikesMap[r.gear_id];
        const data = stripUndefinedFields({
            gear_id: r.gear_id,
            ...(name ? { gear_name: name } : {}),
        });
        return { id: r.id, data };
    });

    return {
        updates,
        listActivitiesRead: list.length,
        matched: rows.length,
        uniqueGearFetched: missing.length,
        needCount,
        unmatchedNeed: Math.max(0, needCount - rows.length),
    };
}
