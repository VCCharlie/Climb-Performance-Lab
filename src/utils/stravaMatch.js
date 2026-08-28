/**
 * src/utils/stravaMatch.js
 * Algoritme om Strava-activiteiten te koppelen aan bestaande site-activiteiten
 * op basis van datum + afstand + duur (fuzzy match, geen Strava ID vereist).
 */

import { climbingMetersFromStrava } from './stravaElevation';
import { isSameCalendarDay } from './stravaTitleSameDay.js';

// Fietstypes die we willen ophalen / koppelen
export const STRAVA_BIKE_TYPES = new Set([
    'Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'Cycling',
]);

// Typen die we expliciet overslaan
const STRAVA_EXCLUDED_TYPES = new Set([
    'Run', 'Walk', 'Hike', 'EBikeRide', 'Swim', 'Workout',
    'WeightTraining', 'Yoga', 'Rowing', 'Kayaking', 'Skiing',
]);

const INDOOR_BIKE_TYPES = new Set(['VirtualRide']);

function isSiteIndoorVirtual(siteType) {
    return INDOOR_BIKE_TYPES.has(String(siteType || '').trim());
}

function isStravaIndoorVirtual(stravaAct) {
    const stravaType = String(stravaAct?.sport_type || stravaAct?.type || '').trim();
    return INDOOR_BIKE_TYPES.has(stravaType) || stravaAct?.trainer === true;
}

/**
 * Both sides are indoor/virtual — duration-based scoring is appropriate.
 * A VirtualRide log row must not fuzzy-match an outdoor Strava Ride on duration alone.
 */
export function isIndoorVirtualPair(siteType, stravaAct) {
    return isSiteIndoorVirtual(siteType) && isStravaIndoorVirtual(stravaAct);
}

export const isIncludedStravaType = (type) =>
    STRAVA_BIKE_TYPES.has(type) && !STRAVA_EXCLUDED_TYPES.has(type);

/**
 * @param {string | null | undefined} siteType
 * @param {object} stravaAct
 * @returns {boolean}
 */
export function isIndoorOrVirtualRide(siteType, stravaAct) {
    return isSiteIndoorVirtual(siteType)
        || isStravaIndoorVirtual(stravaAct);
}

/**
 * Simple token overlap for titles (e.g. "My whoosh" ↔ "My Whoosh - indoor").
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {number} 0–1
 */
export function stravaTitleSimilarity(a, b) {
    const normalize = (s) => String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const left = normalize(a);
    const right = normalize(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.85;

    const leftTokens = new Set(left.split(' ').filter((t) => t.length > 2));
    const rightTokens = new Set(right.split(' ').filter((t) => t.length > 2));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

    let overlap = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) overlap += 1;
    }
    return overlap / Math.max(leftTokens.size, rightTokens.size);
}

// Strava type → intern type
const mapType = (stravaType) => {
    if (stravaType === 'GravelRide') return 'GravelRide';
    if (stravaType === 'MountainBikeRide') return 'Ride';
    if (stravaType === 'Cycling') return 'Ride';
    return stravaType; // 'Ride', 'VirtualRide'
};

// Seconden → "H:MM:SS"
const formatMovingTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// "H:MM:SS", "MM:SS", or seconds (number) → seconds
const parseMovingTime = (timeStr) => {
    if (timeStr == null || timeStr === '') return 0;
    if (typeof timeStr === 'number' && !Number.isNaN(timeStr) && timeStr > 0) {
        return Math.floor(timeStr);
    }
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    const n = Number(String(timeStr).trim());
    return !Number.isNaN(n) && n > 0 ? Math.floor(n) : 0;
};

function distanceDiffRatio(siteDistKm, stravaDistKm) {
    if (siteDistKm > 0 && stravaDistKm > 0) {
        return Math.abs(siteDistKm - stravaDistKm) / Math.max(siteDistKm, stravaDistKm);
    }
    return 1;
}

function timeDiffRatio(siteTimeSec, stravaTimeSec) {
    if (stravaTimeSec > 0 && siteTimeSec > 0) {
        return Math.abs(stravaTimeSec - siteTimeSec) / Math.max(stravaTimeSec, siteTimeSec);
    }
    return 0.5;
}

/**
 * Score a site candidate against a Strava list item.
 * Indoor/virtual rides lean on duration (+ title) when distance is unreliable.
 */
export function scoreStravaSiteMatch(site, stravaAct) {
    const siteDistKm = site.distance || 0;
    const stravaDistKm = (stravaAct.distance || 0) / 1000;
    const distDiff = distanceDiffRatio(siteDistKm, stravaDistKm);
    const siteTimeSec = parseMovingTime(site.moving_time);
    const stravaTimeSec = stravaAct.moving_time || 0;
    const timeDiff = timeDiffRatio(siteTimeSec, stravaTimeSec);
    const titleSim = stravaTitleSimilarity(site.title, stravaAct.name);
    const indoor = isIndoorOrVirtualRide(site.type, stravaAct);
    const indoorPair = isIndoorVirtualPair(site.type, stravaAct);
    const distanceUnreliable = indoorPair || siteDistKm < 1 || stravaDistKm < 1;

    let confidence = null;
    let score;

    if (distanceUnreliable) {
        if (timeDiff < 0.03 || (timeDiff < 0.06 && titleSim >= 0.5)) {
            confidence = 'high';
        } else if (timeDiff < 0.08 || (timeDiff < 0.12 && titleSim >= 0.5)) {
            confidence = 'medium';
        } else if (timeDiff < 0.15 || (timeDiff < 0.2 && titleSim >= 0.65)) {
            confidence = 'low';
        }
        score = timeDiff * 0.65 + (1 - titleSim) * 0.25 + distDiff * 0.1;
    } else {
        if (distDiff < 0.02 && timeDiff < 0.05) {
            confidence = 'high';
        } else if (distDiff < 0.05) {
            confidence = 'medium';
        } else if (distDiff < 0.10) {
            confidence = 'low';
        } else if (timeDiff < 0.04 && titleSim >= 0.6) {
            confidence = 'medium';
        } else if (timeDiff < 0.08 && titleSim >= 0.75) {
            confidence = 'low';
        }
        score = distDiff * 0.7 + timeDiff * 0.3 - titleSim * 0.05;
    }

    return { confidence, distDiff, timeDiff, score, titleSim, indoor, distanceUnreliable };
}

// Converteer Strava API activiteit naar site-formaat
export const normalizeStravaActivity = (act) => {
    // Only mark climbing_from_strava when total_elevation_gain is present.
    // Defaulting missing elevation to 0 + the flag let merges wipe Intervals climbing
    // and protectEnrichedFieldsOnMerge then blocked Intervals from restoring it.
    const climbingMeters = climbingMetersFromStrava(act?.total_elevation_gain);
    return {
        id: `strava_${act.id}`,
        strava_id: String(act.id),
        strava_map: act.map?.summary_polyline || null,
        date: act.start_date_local || null,
        type: mapType(act.sport_type || act.type),
        title: act.name,
        distance: Math.round((act.distance / 1000) * 10) / 10,
        climbing: climbingMeters != null ? climbingMeters : 0,
        ...(climbingMeters != null ? { climbing_from_strava: true } : {}),
        avg_speed: Math.round((act.average_speed * 3.6) * 10) / 10,
        avg_power: Math.round(act.average_watts || 0),
        norm_power: Math.round(act.weighted_average_watts || 0),
        avg_hr: Math.round(act.average_heartrate || 0),
        max_hr: Math.round(act.max_heartrate || 0),
        load: 0,
        rpe: act.perceived_exertion || 0,
        moving_time: formatMovingTime(act.moving_time || 0),
    };
};

/** Local calendar day from site.date (ISO date or datetime). */
export function siteCalendarDateKey(site) {
    const raw = site?.date;
    if (raw == null || raw === '') return null;
    const key = String(raw).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function collectCandidatesOnDates(siteByDate, dateKeys, usedSiteIds) {
    const seen = new Set();
    const candidates = [];
    for (const dateKey of dateKeys) {
        for (const site of siteByDate.get(dateKey) || []) {
            const key = String(site.id);
            if (seen.has(key)) continue;
            seen.add(key);
            if (usedSiteIds.has(site.id) || site.strava_id) continue;
            candidates.push(site);
        }
    }
    return candidates;
}

/**
 * Koppel Strava-activiteiten aan bestaande site-activiteiten via fuzzy matching.
 *
 * Confidence levels:
 *   'high'   — afstand < 2% EN duur < 5% → automatisch geselecteerd
 *   'medium' — afstand < 5%              → automatisch geselecteerd
 *   'low'    — afstand < 10%             → niet auto-geselecteerd, user beslist
 *
 * @returns {{ matched, unmatchedStrava, alreadyLinked }}
 *   matched:        [{strava, site, confidence, distDiff, timeDiff}]
 *   unmatchedStrava: Strava-activiteiten zonder match in site
 *   alreadyLinked:   Strava-activiteiten die al aan een site-activiteit zijn gekoppeld
 */
export const matchStravaToSite = (stravaActivities, siteActivities) => {
    const matched = [];
    const alreadyLinked = [];
    const usedSiteIds = new Set();

    // 1. Index site activities by strava_id for O(1) already-linked check
    // 2. Index site activities by date for O(1) candidate lookup
    const siteByStravaId = new Map();
    const siteByDate = new Map();

    for (const site of siteActivities) {
        if (site.strava_id) {
            siteByStravaId.set(String(site.strava_id), site);
        }
        const dateKey = siteCalendarDateKey(site);
        if (dateKey) {
            if (!siteByDate.has(dateKey)) siteByDate.set(dateKey, []);
            siteByDate.get(dateKey).push(site);
        }
    }

    for (const stravaAct of stravaActivities) {
        const stravaIdStr = String(stravaAct.id);
        const stravaDate = stravaAct.start_date_local.split('T')[0];

        // Efficient O(1) Check: Al gekoppeld?
        const existing = siteByStravaId.get(stravaIdStr);
        if (existing) {
            // Skip stale cross-day strava_id links (legacy adjacent-day auto-match).
            // User must Unlink Strava and re-link via Find on Strava.
            if (!isSameCalendarDay(existing, stravaAct)) {
                continue;
            }
            alreadyLinked.push({
                strava: stravaAct,
                site: existing,
                needsGear: !!stravaAct.gear_id && !existing.gear_id,
                needsHr: !!stravaAct.average_heartrate && (!existing.avg_hr || existing.avg_hr === 0),
            });
            usedSiteIds.add(existing.id);
            continue;
        }

        // Same local calendar day only — adjacent-day fuzzy match caused wrong links
        // (e.g. "My whoosh" on 13 Apr matched to Strava on 14 Apr). Use Find on Strava for manual picks.
        const candidates = collectCandidatesOnDates(
            siteByDate,
            [stravaDate],
            usedSiteIds,
        );

        if (candidates.length === 0) continue;

        let best = null;

        for (const site of candidates) {
            if (!isSameCalendarDay(site, stravaAct)) continue;
            const scored = scoreStravaSiteMatch(site, stravaAct);
            if (scored.confidence && (!best || scored.score < best.score)) {
                best = {
                    site,
                    confidence: scored.confidence,
                    distDiff: scored.distDiff,
                    timeDiff: scored.timeDiff,
                    score: scored.score,
                    titleSim: scored.titleSim,
                };
            }
        }

        if (best) {
            matched.push({
                strava: stravaAct,
                site: best.site,
                confidence: best.confidence,
                distDiff: best.distDiff,
                timeDiff: best.timeDiff,
            });
            usedSiteIds.add(best.site.id);
        }
    }

    const matchedStravaIds = new Set([
        ...matched.map(m => m.strava.id),
        ...alreadyLinked.map(m => m.strava.id),
    ]);
    const unmatchedStrava = stravaActivities.filter(s => !matchedStravaIds.has(s.id));

    return { matched, unmatchedStrava, alreadyLinked };
};
