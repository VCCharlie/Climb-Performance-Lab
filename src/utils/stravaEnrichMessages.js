/**
 * User-facing Strava enrich status messages (bulk + silent enrich).
 */

import {
    STRAVA_RECONNECT_PRIVATE_READ_MSG,
    stravaConfigHasPrivateRead,
} from './stravaOAuthScopes';
import { formatNlNumber } from './formatters';

/**
 * @param {object} result — enrichSelectedActivitiesFromStrava return value
 * @param {{ stravaConfig?: object | null }} [opts]
 * @returns {string | null} null when caller should use success message path
 */
export function buildStravaEnrichFailureMessage(result, opts = {}) {
    const {
        updates = [],
        linkedCount = 0,
        ridesProcessed = 0,
        unchanged = 0,
        failed = 0,
        rateLimitHits = 0,
        stravaTotalFetched = 0,
        bikeActivitiesFound = 0,
        matchCount = 0,
    } = result || {};

    if (updates.length > 0) return null;

    const rateLimitNote = rateLimitHits > 0
        ? ' Strava rate limit hit — some details may be incomplete; try again in ~15 minutes.'
        : '';

    if (failed > 0 || rateLimitHits > 0) {
        return `No fields updated (${formatNlNumber(failed)} Strava request(s) failed — check connection or rate limits). ${formatNlNumber(unchanged)} ride(s) already matched Strava.${rateLimitNote}`;
    }

    const privateRead = stravaConfigHasPrivateRead(opts.stravaConfig);

    if (bikeActivitiesFound === 0) {
        if (stravaTotalFetched === 0) {
            if (privateRead === false) {
                return STRAVA_RECONNECT_PRIVATE_READ_MSG;
            }
            return 'No Strava activities returned for the selected date span. '
                + 'If your rides are private, reconnect Strava in Settings (private read access). '
                + 'You can also link one row manually via Find on Strava.';
        }
        return 'Strava returned activities in this date span, but none were bike rides (Ride, VirtualRide, GravelRide, …). '
            + 'Try Find on Strava on a single row to link manually.';
    }

    if (ridesProcessed === 0 && linkedCount === 0) {
        if (matchCount === 0) {
            return `Found ${formatNlNumber(bikeActivitiesFound)} Strava bike ride(s) in the date span, but none matched the selected row(s) by date, duration, or distance. `
                + 'Try Find on Strava on a single row to pick the correct activity.';
        }
        return `Nothing new from Strava for ${formatNlNumber(unchanged || 0)} selected ride(s) — link, gear, route, HR, RPE, and segments already match.`;
    }

    return `Nothing new from Strava for ${formatNlNumber(unchanged || 0)} selected ride(s) — link, gear, route, HR, RPE, and segments already match.`;
}
