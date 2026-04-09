/**
 * Voorkomt dat Intervals.icu (of andere) sync lege / generieke waarden
 * over bestaande handmatige of Strava-verrijkte velden heen schrijft bij merge: true.
 */

import { normalizeStravaActivityId } from './strava';

const GENERIC_TITLE = /^(Morning|Lunch|Afternoon|Evening|Night) Ride$|^Untitled$/i;

const isGenericTitle = (t) => {
    const s = (t || '').trim();
    return !s || GENERIC_TITLE.test(s);
};

const isSpecificTitle = (t) => {
    const s = (t || '').trim();
    return !!s && !GENERIC_TITLE.test(s);
};

const hasStravaId = (v) => {
    const n = normalizeStravaActivityId(v);
    return !!(n && n.length >= 6);
};

/**
 * @param {object} incoming - Activiteit die we naar Firestore willen schrijven
 * @param {object|undefined|null} existing - Huidige activiteit uit app-state (zelfde id), indien bekend
 * @returns {object} Payload voor setDoc(..., { merge: true })
 */
export function protectEnrichedFieldsOnMerge(incoming, existing) {
    if (!incoming || typeof incoming !== 'object') return incoming;
    const out = { ...incoming };

    if (!existing || typeof existing !== 'object') return out;

    const inRpe = Number(incoming.rpe);
    const exRpe = Number(existing.rpe);
    if ((!inRpe || inRpe === 0) && exRpe > 0) {
        out.rpe = existing.rpe;
    }

    const inTitle = (incoming.title || '').trim();
    const exTitle = (existing.title || '').trim();

    if (isSpecificTitle(exTitle) && isGenericTitle(inTitle)) {
        out.title = existing.title;
    }

    // Strava link + route + gear: Intervals payload often omits these; never wipe enriched data.
    if (hasStravaId(existing.strava_id) && !hasStravaId(incoming.strava_id)) {
        out.strava_id = existing.strava_id;
    }
    const inMap = incoming.strava_map != null && String(incoming.strava_map).trim() !== '';
    const exMap = existing.strava_map != null && String(existing.strava_map).trim() !== '';
    if (exMap && !inMap) {
        out.strava_map = existing.strava_map;
    }
    if (existing.gear_id && !incoming.gear_id) {
        out.gear_id = existing.gear_id;
    }
    const exGearName = existing.gear_name != null && String(existing.gear_name).trim() !== '';
    const inGearName = incoming.gear_name != null && String(incoming.gear_name).trim() !== '';
    if (exGearName && !inGearName) {
        out.gear_name = existing.gear_name;
    }

    const inHr = Number(incoming.avg_hr);
    const exHr = Number(existing.avg_hr);
    if ((!inHr || inHr === 0) && exHr > 0) {
        out.avg_hr = existing.avg_hr;
    }
    const inMx = Number(incoming.max_hr);
    const exMx = Number(existing.max_hr);
    if ((!inMx || inMx === 0) && exMx > 0) {
        out.max_hr = existing.max_hr;
    }

    return out;
}
