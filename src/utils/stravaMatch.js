/**
 * src/utils/stravaMatch.js
 * Algoritme om Strava-activiteiten te koppelen aan bestaande site-activiteiten
 * op basis van datum + afstand + duur (fuzzy match, geen Strava ID vereist).
 */

// Fietstypes die we willen ophalen / koppelen
export const STRAVA_BIKE_TYPES = new Set([
    'Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'Cycling'
]);

// Typen die we expliciet overslaan
const STRAVA_EXCLUDED_TYPES = new Set([
    'Run', 'Walk', 'Hike', 'EBikeRide', 'Swim', 'Workout',
    'WeightTraining', 'Yoga', 'Rowing', 'Kayaking', 'Skiing'
]);

export const isIncludedStravaType = (type) =>
    STRAVA_BIKE_TYPES.has(type) && !STRAVA_EXCLUDED_TYPES.has(type);

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

// "H:MM:SS" of "MM:SS" → seconden
const parseMovingTime = (timeStr) => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
};

// Converteer Strava API activiteit naar site-formaat
export const normalizeStravaActivity = (act) => ({
    id: `strava_${act.id}`,
    strava_id: String(act.id),
    date: act.start_date_local.split('T')[0],
    type: mapType(act.sport_type || act.type),
    title: act.name,
    distance: Math.round((act.distance / 1000) * 10) / 10,
    climbing: Math.round(act.total_elevation_gain || 0),
    avg_speed: Math.round((act.average_speed * 3.6) * 10) / 10,
    avg_power: Math.round(act.average_watts || 0),
    norm_power: Math.round(act.weighted_average_watts || 0),
    load: 0,
    rpe: act.perceived_exertion || 0,
    moving_time: formatMovingTime(act.moving_time || 0)
});

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
        const dateKey = site.date?.split('T')[0];
        if (dateKey) {
            if (!siteByDate.has(dateKey)) siteByDate.set(dateKey, []);
            siteByDate.get(dateKey).push(site);
        }
    }

    for (const stravaAct of stravaActivities) {
        const stravaIdStr = String(stravaAct.id);
        const stravaDate = stravaAct.start_date_local.split('T')[0];
        const stravaDistKm = stravaAct.distance / 1000;
        const stravaTimeSec = stravaAct.moving_time || 0;

        // Efficient O(1) Check: Al gekoppeld?
        const existing = siteByStravaId.get(stravaIdStr);
        if (existing) {
            alreadyLinked.push({
                strava: stravaAct,
                site: existing,
                needsGear: !!stravaAct.gear_id && !existing.gear_id,
                needsRpe: (!existing.rpe || existing.rpe === 0) && !!stravaAct.perceived_exertion
            });
            usedSiteIds.add(existing.id);
            continue;
        }

        // Efficient O(1) Group lookup: Kandidaten op dezelfde datum
        const candidatesOnDate = siteByDate.get(stravaDate) || [];
        const candidates = candidatesOnDate.filter(site => {
            return !usedSiteIds.has(site.id) && !site.strava_id;
        });

        if (candidates.length === 0) continue;

        // Scoor elke kandidaat: 70% gewicht op afstand, 30% op duur
        let best = null;

        for (const site of candidates) {
            const siteDist = site.distance || 0;
            const distDiff = siteDist > 0 && stravaDistKm > 0
                ? Math.abs(siteDist - stravaDistKm) / Math.max(siteDist, stravaDistKm)
                : 1;

            const siteTimeSec = parseMovingTime(site.moving_time);
            const timeDiff = stravaTimeSec > 0 && siteTimeSec > 0
                ? Math.abs(stravaTimeSec - siteTimeSec) / Math.max(stravaTimeSec, siteTimeSec)
                : 0.5;

            const score = distDiff * 0.7 + timeDiff * 0.3;

            // Bepaal confidence op basis van afstandsverschil (primair)
            let confidence = null;
            if (distDiff < 0.02 && timeDiff < 0.05) {
                confidence = 'high';
            } else if (distDiff < 0.05) {
                confidence = 'medium';
            } else if (distDiff < 0.10) {
                confidence = 'low';
            }

            if (confidence && (!best || score < best.score)) {
                best = { site, confidence, distDiff, timeDiff, score };
            }
        }

        if (best) {
            matched.push({
                strava: stravaAct,
                site: best.site,
                confidence: best.confidence,
                distDiff: best.distDiff,
                timeDiff: best.timeDiff
            });
            usedSiteIds.add(best.site.id);
        }
    }

    const matchedStravaIds = new Set([
        ...matched.map(m => m.strava.id),
        ...alreadyLinked.map(m => m.strava.id)
    ]);
    const unmatchedStrava = stravaActivities.filter(s => !matchedStravaIds.has(s.id));

    return { matched, unmatchedStrava, alreadyLinked };
};
