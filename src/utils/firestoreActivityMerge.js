/**
 * Voorkomt dat Intervals.icu (of andere) sync lege / generieke waarden
 * over bestaande handmatige of Strava-verrijkte velden heen schrijft bij merge: true.
 */

const GENERIC_TITLE = /^(Morning|Lunch|Afternoon|Evening|Night) Ride$|^Untitled$/i;

const isGenericTitle = (t) => {
    const s = (t || '').trim();
    return !s || GENERIC_TITLE.test(s);
};

const isSpecificTitle = (t) => {
    const s = (t || '').trim();
    return !!s && !GENERIC_TITLE.test(s);
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

    return out;
}
