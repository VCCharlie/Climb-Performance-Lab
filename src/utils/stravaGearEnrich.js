/**
 * After linking strava_id, fill gear_id / gear_name (and optional map) from Strava API.
 */

import { stripUndefinedFields } from './mergeActivities';

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
    const stravaActId = String(merged.strava_id);

    const needsDetail =
        !out.gear_id
        || !out.strava_map
        || (!(out.gear_name != null && String(out.gear_name).trim()));

    let detail = null;
    if (needsDetail) {
        try {
            const resp = await fetch(`https://www.strava.com/api/v3/activities/${stravaActId}`, {
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

    return stripUndefinedFields(out);
}
