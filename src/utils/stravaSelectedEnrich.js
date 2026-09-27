/**
 * Unified Strava enrichment for checkbox-selected site activities:
 * 1. Auto-link via fuzzy match (no manual Strava URL required)
 * 2. Full detail enrich: gear, map, KOM, HR, RPE, distance/time fixes
 */

import { safeLocalStorageSet } from './safeStorage.js';

import { runInBatches } from './async';
import { matchStravaToSite, STRAVA_BIKE_TYPES, isIndoorOrVirtualRide } from './stravaMatch';
import { fetchStravaActivitiesInRange } from './stravaLinkIntervalsFetch';
import { buildStravaKomSummaryFromActivityDetail } from './stravaSegmentKomSummary';
import { buildStravaDetailEnrichmentUpdates } from './stravaGearEnrich';
import { stripUndefinedFields } from './mergeActivities';
import { shouldApplyStravaTitleOnMatch, stravaStartDatePatch } from './stravaTitleSameDay';
import { climbingPatchFromStravaActivity } from './stravaElevation';

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
        const type = a.sport_type || a.type;
        if (!STRAVA_BIKE_TYPES.has(type)) return false;
        if (!skipShortNoPowerRides) return true;
        if (isIndoorOrVirtualRide(type, a)) return true;
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
                safeLocalStorageSet('stravaBikesMap', JSON.stringify(bikesMap));
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
 * @returns {Promise<{ updates: { id: string | number, data: object }[], linkedCount: number, rateLimitHits: number }>}
 */
async function buildStravaLinkPhaseUpdates(siteActivities, bikeActivities, bikesMap, token, deviceProfileTitles = []) {
    const result = matchStravaToSite(bikeActivities, siteActivities);
    const candidates = [];
    let rateLimitHits = 0;
    /** @type {string[]} */
    const rateLimitedActivityIds = [];

    if (result?.matched?.length > 0) {
        candidates.push(...result.matched.filter((m) => m.confidence !== 'low'));
    }
    if (result?.alreadyLinked?.length > 0) {
        candidates.push(...result.alreadyLinked);
    }

    if (candidates.length === 0) {
        return {
            updates: [],
            linkedCount: 0,
            rateLimitHits: 0,
            rateLimitedActivityIds: [],
            matchCount: 0,
        };
    }

    const linkPatches = [];
    let linkedCount = 0;

    await runInBatches(candidates, 5, async (m) => {
        const hadStravaId = !!m.site.strava_id;
        const siteNeedsRpe = !m.site.rpe || m.site.rpe === 0;
        const siteNeedsHr = !m.site.avg_hr || m.site.avg_hr === 0;
        const siteNeedsGear = !m.site.gear_id && !!m.strava.gear_id;
        const stravaListTitle = (m.strava.name || '').trim();
        const needsTitle = shouldApplyStravaTitleOnMatch(m.site, m.strava, {
            gearName: m.site.gear_name,
            deviceProfileTitles,
        });
        const needsMap = !m.site.strava_map || String(m.site.strava_map).trim() === '';
        const needsWork = !m.site.work || Number(m.site.work) === 0;
        const needsDetail = siteNeedsRpe || siteNeedsHr || siteNeedsGear || needsMap || needsWork;

        if (
            m.site.strava_id
            && !siteNeedsRpe
            && !siteNeedsGear
            && !siteNeedsHr
            && !needsTitle
            && !needsMap
            && !needsWork
        ) {
            return;
        }

        let stravaDetailed = m.strava;
        if (needsDetail) {
            try {
                const detResp = await fetch(
                    `https://www.strava.com/api/v3/activities/${m.strava.id}?include_all_efforts=true`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (detResp.status === 429) {
                    rateLimitHits += 1;
                    rateLimitedActivityIds.push(String(m.site.id));
                } else if (detResp.ok) {
                    stravaDetailed = await detResp.json();
                }
            } catch {
                /* rate limit / offline */
            }
        }

        const gearId = stravaDetailed.gear_id || m.strava.gear_id || null;
        const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;
        const stravaTitle = (stravaDetailed.name || stravaListTitle || '').trim();
        const komSummary = needsDetail && Object.prototype.hasOwnProperty.call(stravaDetailed, 'segment_efforts')
            ? buildStravaKomSummaryFromActivityDetail(stravaDetailed)
            : null;

        const updateData = stripUndefinedFields({
            strava_id: String(stravaDetailed.id || m.strava.id),
            ...stravaStartDatePatch(stravaDetailed),
            ...(needsMap && stravaDetailed.map?.summary_polyline
                ? { strava_map: stravaDetailed.map.summary_polyline }
                : {}),
            type: stravaDetailed.sport_type || stravaDetailed.type || m.site.type,
            ...(needsTitle && stravaTitle ? { title: stravaTitle } : {}),
            ...(siteNeedsGear && gearId ? { gear_id: gearId, gear_name: gearName } : {}),
            ...(siteNeedsRpe && stravaDetailed.perceived_exertion && { rpe: stravaDetailed.perceived_exertion }),
            ...(siteNeedsHr && stravaDetailed.average_heartrate && { avg_hr: Math.round(stravaDetailed.average_heartrate) }),
            ...((!m.site.max_hr || m.site.max_hr === 0) && stravaDetailed.max_heartrate && { max_hr: Math.round(stravaDetailed.max_heartrate) }),
            ...(komSummary != null ? { strava_kom_summary: komSummary || null } : {}),
            ...climbingPatchFromStravaActivity(stravaDetailed),
        });

        const hasChanges = Object.keys(updateData).some((k) => updateData[k] !== m.site[k]);
        if (!hasChanges) return;

        linkPatches.push({ id: m.site.id, data: updateData });
        if (!hadStravaId && updateData.strava_id) {
            linkedCount += 1;
        }
    });

    return {
        updates: linkPatches,
        linkedCount,
        rateLimitHits,
        rateLimitedActivityIds,
        matchCount: candidates.length,
    };
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
 *   onRateLimit?: (hits: number) => void,
 * }} [opts]
 */
export async function enrichSelectedActivitiesFromStrava(selectedActivities, token, opts = {}) {
    const emptyResult = {
        updates: [],
        linkedCount: 0,
        detailUpdatedCount: 0,
        ridesProcessed: 0,
        unchanged: 0,
        failed: 0,
        rateLimitHits: 0,
        rateLimitedActivityIds: [],
        failedActivityIds: [],
        stravaTotalFetched: 0,
        bikeActivitiesFound: 0,
        matchCount: 0,
    };

    const list = (selectedActivities || []).filter((a) => a?.id != null);
    if (!token || list.length === 0) {
        return emptyResult;
    }

    const span = dateSpanFromActivities(list);
    if (!span) {
        return emptyResult;
    }

    opts.onProgress?.(`Strava list ${span.start} → ${span.end}…`);
    const allStrava = await fetchStravaActivitiesInRange(token, span.start, span.end);
    const bikeActivities = filterBikeActivities(allStrava, {
        skipShortNoPowerRides: opts.skipShortNoPowerRides === true,
    });

    if (bikeActivities.length === 0) {
        return {
            ...emptyResult,
            stravaTotalFetched: allStrava.length,
            bikeActivitiesFound: 0,
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
        opts.deviceProfileTitles || [],
    );
    const linkUpdates = linkPhase.updates;
    const linkedCount = linkPhase.linkedCount;
    let rateLimitHits = linkPhase.rateLimitHits || 0;
    const rateLimitedActivityIds = [...(linkPhase.rateLimitedActivityIds || [])];
    const matchCount = linkPhase.matchCount || 0;

    const mergedSelected = applyUpdatesToActivities(list, linkUpdates);
    const withStrava = mergedSelected.filter((a) => a?.strava_id);

    let detailUpdatedCount = 0;
    let ridesProcessed = 0;
    let unchanged = 0;
    let failed = 0;
    let detailUpdates = [];
    let detailResult = null;

    if (withStrava.length > 0) {
        opts.onProgress?.(`Strava details for ${withStrava.length} ride(s)…`);
        detailResult = await buildStravaDetailEnrichmentUpdates(withStrava, token, {
            concurrency: opts.concurrency ?? 3,
            forceStravaDetail: opts.forceStravaDetail !== false,
            onProgress: opts.onProgress,
        });
        detailUpdates = detailResult.updates;
        detailUpdatedCount = detailResult.updates.length;
        ridesProcessed = detailResult.ridesProcessed;
        unchanged = detailResult.unchanged;
        failed = detailResult.failed;
        rateLimitHits += detailResult.rateLimitHits || 0;
        rateLimitedActivityIds.push(...(detailResult.rateLimitedActivityIds || []));
    }

    const mergedUpdates = mergeUpdatePatches(linkUpdates, detailUpdates);
    const mergedSelectedFinal = applyUpdatesToActivities(list, mergedUpdates);

    if (rateLimitHits > 0) {
        opts.onRateLimit?.(rateLimitHits);
    }

    const failedActivityIds = [...(detailResult?.failedActivityIds || [])];

    return {
        updates: mergedUpdates,
        linkedCount,
        detailUpdatedCount,
        ridesProcessed,
        unchanged,
        failed,
        rateLimitHits,
        rateLimitedActivityIds: [...new Set(rateLimitedActivityIds)],
        failedActivityIds: [...new Set(failedActivityIds)],
        mergedActivities: mergedSelectedFinal,
        stravaTotalFetched: allStrava.length,
        bikeActivitiesFound: bikeActivities.length,
        matchCount,
    };
}
