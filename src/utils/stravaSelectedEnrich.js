/**
 * Unified Strava enrichment for checkbox-selected site activities:
 * 1. Auto-link via fuzzy match (no manual Strava URL required)
 * 2. Full detail enrich: gear, map, KOM, HR, RPE, distance/time fixes
 */

import { runInBatches } from './async';
import { matchStravaToSite, STRAVA_BIKE_TYPES } from './stravaMatch';
import { fetchStravaActivitiesInRange } from './stravaLinkIntervalsFetch';
import { buildStravaKomSummaryFromActivityDetail } from './stravaSegmentKomSummary';
import { buildStravaDetailEnrichmentUpdates } from './stravaGearEnrich';
import { stripUndefinedFields } from './mergeActivities';

/**
 * @param {object[]} activities
 * @returns {{ start: string, end: string } | null} ISO YYYY-MM-DD span (inclusive)
 */
export function dateSpanFromActivities(activities) {
    const dates = (activities || [])
        .map((a) => (a?.date && String(a.date).split('T')[0]) || '')
        .filter(Boolean)
        .sort();
    if (dates.length === 0) return null;
    return { start: dates[0], end: dates[dates.length - 1] };
}

function filterBikeActivities(stravaList, { skipShortNoPowerRides = false } = {}) {
    return (stravaList || []).filter((a) => {
        if (!STRAVA_BIKE_TYPES.has(a.sport_type || a.type)) return false;
        if (!skipShortNoPowerRides) return true;
        const noPower = !a.average_watts || a.average_watts === 0;
        const isShort = !a.distance || (a.distance / 1000) < 5;
        if (noPower && isShort) return false;
        return true;
    });
}

async function loadBikesMap(token, bikeActivities) {
    const bikesMap = {};
    try {
        const athleteResp = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (athleteResp.ok) {
            const athleteData = await athleteResp.json();
            (athleteData.bikes || []).forEach((b) => {
                if (b.id) bikesMap[b.id] = b.name || 'Bike';
            });
        }

        const unknownGearSet = new Set();
        for (const a of bikeActivities) {
            if (a.gear_id && !bikesMap[a.gear_id]) {
                unknownGearSet.add(a.gear_id);
            }
        }
        const unknownGearIds = [...unknownGearSet];
        if (unknownGearIds.length > 0) {
            await runInBatches(unknownGearIds, 5, async (gid) => {
                try {
                    const r = await fetch(`https://www.strava.com/api/v3/gear/${gid}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (r.ok) {
                        const g = await r.json();
                        bikesMap[gid] = g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Bike';
                    }
                } catch {
                    /* ignore */
                }
            });
        }
        if (Object.keys(bikesMap).length > 0) {
            try {
                localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap));
            } catch {
                /* quota */
            }
        }
    } catch {
        /* offline */
    }
    return bikesMap;
}

/**
 * Fuzzy-link + detail fields for rows still missing strava_id or partial Strava data.
 * @returns {Promise<{ updates: { id: string | number, data: object }[], linkedCount: number }>}
 */
async function buildStravaLinkPhaseUpdates(siteActivities, bikeActivities, bikesMap, token) {
    const result = matchStravaToSite(bikeActivities, siteActivities);
    const candidates = [];

    if (result?.matched?.length > 0) {
        candidates.push(...result.matched.filter((m) => m.confidence !== 'low'));
    }
    if (result?.alreadyLinked?.length > 0) {
        candidates.push(...result.alreadyLinked);
    }

    if (candidates.length === 0) {
        return { updates: [], linkedCount: 0 };
    }

    const linkPatches = [];
    let linkedCount = 0;

    await runInBatches(candidates, 5, async (m) => {
        const hadStravaId = !!m.site.strava_id;
        const siteNeedsRpe = !m.site.rpe || m.site.rpe === 0;
        const siteNeedsHr = !m.site.avg_hr || m.site.avg_hr === 0;
        const siteNeedsGear = !m.site.gear_id && !!m.strava.gear_id;
        const stravaListTitle = (m.strava.name || '').trim();
        const titleDiffersFromStrava =
            !!stravaListTitle && m.site.title !== stravaListTitle;

        if (m.site.strava_id && !siteNeedsRpe && !siteNeedsGear && !siteNeedsHr && !titleDiffersFromStrava) {
            return;
        }

        let stravaDetailed = m.strava;
        try {
            const detResp = await fetch(
                `https://www.strava.com/api/v3/activities/${m.strava.id}?include_all_efforts=true`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (detResp.ok) {
                stravaDetailed = await detResp.json();
            }
        } catch {
            /* rate limit / offline */
        }

        const gearId = stravaDetailed.gear_id || null;
        const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;
        const stravaTitle = (stravaDetailed.name || '').trim();
        const komSummary = buildStravaKomSummaryFromActivityDetail(stravaDetailed);

        const updateData = stripUndefinedFields({
            strava_id: String(stravaDetailed.id),
            strava_map: stravaDetailed.map?.summary_polyline || m.site.strava_map || null,
            type: stravaDetailed.sport_type || stravaDetailed.type || m.site.type,
            ...(gearId && { gear_id: gearId, gear_name: gearName }),
            ...(stravaTitle && { title: stravaTitle }),
            ...(siteNeedsRpe && stravaDetailed.perceived_exertion && { rpe: stravaDetailed.perceived_exertion }),
            ...(siteNeedsHr && stravaDetailed.average_heartrate && { avg_hr: Math.round(stravaDetailed.average_heartrate) }),
            ...((!m.site.max_hr || m.site.max_hr === 0) && stravaDetailed.max_heartrate && { max_hr: Math.round(stravaDetailed.max_heartrate) }),
            ...(Object.prototype.hasOwnProperty.call(stravaDetailed, 'segment_efforts')
                ? { strava_kom_summary: komSummary || null }
                : {}),
        });

        const hasChanges = Object.keys(updateData).some((k) => updateData[k] !== m.site[k]);
        if (!hasChanges) return;

        linkPatches.push({ id: m.site.id, data: updateData });
        if (!hadStravaId && updateData.strava_id) {
            linkedCount += 1;
        }
    });

    return { updates: linkPatches, linkedCount };
}

function mergeUpdatePatches(...patchLists) {
    const byId = new Map();
    for (const list of patchLists) {
        for (const { id, data } of list || []) {
            const key = String(id);
            const prev = byId.get(key);
            byId.set(key, {
                id,
                data: stripUndefinedFields({ ...(prev?.data || {}), ...data }),
            });
        }
    }
    return [...byId.values()];
}

function applyUpdatesToActivities(activities, updates) {
    if (!updates?.length) return (activities || []).map((a) => ({ ...a }));
    const patchMap = new Map(updates.map((u) => [String(u.id), u.data]));
    return (activities || []).map((a) => {
        const patch = patchMap.get(String(a.id));
        return patch ? stripUndefinedFields({ ...a, ...patch }) : { ...a };
    });
}

/**
 * @param {object[]} selectedActivities
 * @param {string} token
 * @param {{
 *   onProgress?: (msg: string) => void,
 *   concurrency?: number,
 *   skipShortNoPowerRides?: boolean,
 *   forceStravaDetail?: boolean,
 * }} [opts]
 */
export async function enrichSelectedActivitiesFromStrava(selectedActivities, token, opts = {}) {
    const list = (selectedActivities || []).filter((a) => a?.id != null);
    if (!token || list.length === 0) {
        return {
            updates: [],
            linkedCount: 0,
            detailUpdatedCount: 0,
            ridesProcessed: 0,
            unchanged: 0,
            failed: 0,
        };
    }

    const span = dateSpanFromActivities(list);
    if (!span) {
        return {
            updates: [],
            linkedCount: 0,
            detailUpdatedCount: 0,
            ridesProcessed: 0,
            unchanged: 0,
            failed: 0,
        };
    }

    opts.onProgress?.(`Strava list ${span.start} → ${span.end}…`);
    const allStrava = await fetchStravaActivitiesInRange(token, span.start, span.end);
    const bikeActivities = filterBikeActivities(allStrava, {
        skipShortNoPowerRides: opts.skipShortNoPowerRides === true,
    });

    if (bikeActivities.length === 0) {
        return {
            updates: [],
            linkedCount: 0,
            detailUpdatedCount: 0,
            ridesProcessed: 0,
            unchanged: 0,
            failed: 0,
        };
    }

    opts.onProgress?.('Resolving bike names…');
    const bikesMap = await loadBikesMap(token, bikeActivities);

    opts.onProgress?.('Matching & linking selected activities…');
    const linkPhase = await buildStravaLinkPhaseUpdates(
        list,
        bikeActivities,
        bikesMap,
        token,
    );
    const linkUpdates = linkPhase.updates;
    const linkedCount = linkPhase.linkedCount;

    const mergedSelected = applyUpdatesToActivities(list, linkUpdates);
    const withStrava = mergedSelected.filter((a) => a?.strava_id);

    let detailUpdatedCount = 0;
    let ridesProcessed = 0;
    let unchanged = 0;
    let failed = 0;
    let detailUpdates = [];

    if (withStrava.length > 0) {
        opts.onProgress?.(`Strava details for ${withStrava.length} ride(s)…`);
        const detailResult = await buildStravaDetailEnrichmentUpdates(withStrava, token, {
            concurrency: opts.concurrency ?? 3,
            forceStravaDetail: opts.forceStravaDetail !== false,
            onProgress: opts.onProgress,
        });
        detailUpdates = detailResult.updates;
        detailUpdatedCount = detailResult.updates.length;
        ridesProcessed = detailResult.ridesProcessed;
        unchanged = detailResult.unchanged;
        failed = detailResult.failed;
    }

    const mergedUpdates = mergeUpdatePatches(linkUpdates, detailUpdates);

    return {
        updates: mergedUpdates,
        linkedCount,
        detailUpdatedCount,
        ridesProcessed,
        unchanged,
        failed,
    };
}
