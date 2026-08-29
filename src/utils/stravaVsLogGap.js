/**
 * Compare Strava bike activity totals vs the local activity log for a date range,
 * and list Strava rides that are not represented in the log (by Strava ID or optional fuzzy match).
 */
import { STRAVA_BIKE_TYPES, matchStravaToSite } from './stravaMatch.js';

/**
 * @param {boolean} includeEbikeRide
 * @returns {Set<string>}
 */
export function buildGapBikeSportTypes(includeEbikeRide) {
    const s = new Set(STRAVA_BIKE_TYPES);
    if (includeEbikeRide) s.add('EBikeRide');
    return s;
}

/**
 * @param {object} stravaAct
 * @param {Set<string>} sportTypes
 */
export function stravaActivityMatchesGapTypes(stravaAct, sportTypes) {
    const st = stravaAct.sport_type || stravaAct.type || '';
    return sportTypes.has(st);
}

/**
 * Local calendar date string YYYY-MM-DD from Strava list activity.
 * @param {object} a
 * @returns {string}
 */
export function stravaLocalDateYmd(a) {
    const raw = a?.start_date_local || a?.start_date || '';
    return String(raw).split('T')[0];
}

/**
 * @param {string} dateStr — site activity `date` (ISO or YYYY-MM-DD)
 * @returns {string} YYYY-MM-DD or '' if invalid
 */
export function siteDateToYmd(dateStr) {
    if (!dateStr) return '';
    const day = String(dateStr).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
}

/**
 * @param {string} ymd
 * @param {string} startYmd
 * @param {string} endYmd
 */
export function ymdInRangeInclusive(ymd, startYmd, endYmd) {
    if (!ymd || !startYmd || !endYmd) return false;
    return ymd >= startYmd && ymd <= endYmd;
}

/**
 * @param {object[]} stravaBikeActivities — raw Strava list activities (bike types already filtered or full list)
 * @param {object[]} siteActivities — local log rows
 * @param {string} startYmd
 * @param {string} endYmd
 * @param {{ includeEbikeRide?: boolean, useFuzzyMatch?: boolean }} opts
 */
export function computeStravaVsLogGap(stravaBikeActivities, siteActivities, startYmd, endYmd, opts = {}) {
    const includeEbikeRide = !!opts.includeEbikeRide;
    const useFuzzyMatch = !!opts.useFuzzyMatch;
    const sportTypes = buildGapBikeSportTypes(includeEbikeRide);

    const stravaInRange = (stravaBikeActivities || []).filter((a) => {
        if (!stravaActivityMatchesGapTypes(a, sportTypes)) return false;
        const ymd = stravaLocalDateYmd(a);
        return ymdInRangeInclusive(ymd, startYmd, endYmd);
    });

    const siteBikeAll = (siteActivities || []).filter((a) => {
        const t = a?.type || '';
        return sportTypes.has(t);
    });

    const siteInRange = siteBikeAll.filter((a) => {
        const ymd = siteDateToYmd(a.date);
        return ymd && ymdInRangeInclusive(ymd, startYmd, endYmd);
    });

    let stravaTotalM = 0;
    for (const a of stravaInRange) {
        stravaTotalM += Number(a.distance) || 0;
    }
    let logTotalKm = 0;
    for (const a of siteInRange) {
        logTotalKm += Number(a.distance) || 0;
    }

    const stravaTotalKm = stravaTotalM / 1000;
    const deltaKm = stravaTotalKm - logTotalKm;

    const siteStravaIds = new Set();
    for (const s of siteActivities || []) {
        if (s?.strava_id) siteStravaIds.add(String(s.strava_id));
    }

    const strictMissing = stravaInRange.filter((a) => !siteStravaIds.has(String(a.id)));

    let strictMissingM = 0;
    for (const a of strictMissing) {
        strictMissingM += Number(a.distance) || 0;
    }

    let fuzzyMissing = strictMissing;
    let fuzzyMatchedCount = 0;
    if (useFuzzyMatch) {
        const { unmatchedStrava, matched, alreadyLinked } = matchStravaToSite(stravaInRange, siteBikeAll);
        fuzzyMissing = unmatchedStrava;
        fuzzyMatchedCount = matched.length + alreadyLinked.length;
    }

    let fuzzyMissingM = 0;
    for (const a of fuzzyMissing) {
        fuzzyMissingM += Number(a.distance) || 0;
    }

    return {
        range: { startYmd, endYmd },
        sportTypes: Array.from(sportTypes),
        stravaRideCount: stravaInRange.length,
        logRideCount: siteInRange.length,
        stravaTotalKm,
        logTotalKm,
        deltaKm,
        strictMissingCount: strictMissing.length,
        strictMissingKm: strictMissingM / 1000,
        strictMissing,
        fuzzyMissingCount: fuzzyMissing.length,
        fuzzyMissingKm: fuzzyMissingM / 1000,
        fuzzyMissing,
        fuzzyMatchedCount,
        useFuzzyMatch,
    };
}

/**
 * Default date range: calendar YTD in local time.
 * @param {Date} [now]
 * @returns {{ startYmd: string, endYmd: string }}
 */
export function defaultGapRangeYtd(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return {
        startYmd: `${y}-01-01`,
        endYmd: `${y}-${m}-${d}`,
    };
}
