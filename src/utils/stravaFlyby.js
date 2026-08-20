/**
 * Strava Flyby launch helpers.
 * Flyby viewer loads match data from nene.strava.com with browser cookies (withCredentials),
 * not the app's OAuth bearer token. Wrong activity IDs return {} → "No flyby data found."
 */

import { notify } from './notify.js';
import { normalizeStravaActivityId, stravaFlybyUrl } from './strava.js';

/**
 * Resolve a numeric Strava activity id for external links / Flyby.
 * Rejects the common mis-link where intervals row id digits were stored as strava_id.
 * @param {object | null | undefined} activity
 * @returns {string | null}
 */
export function resolveFlybyStravaId(activity) {
    if (!activity || activity.strava_id == null || activity.strava_id === '') return null;
    const id = normalizeStravaActivityId(activity.strava_id);
    if (!id) return null;

    const activityDigits = activity.id != null ? String(activity.id).replace(/\D/g, '') : '';
    if (activityDigits.length >= 6 && activityDigits === id) {
        return null;
    }
    return id;
}

/**
 * Confirm the id exists for the connected athlete and return Strava's canonical id.
 * @param {string | number | null | undefined} stravaId
 * @param {string | null | undefined} token
 * @returns {Promise<{ ok: true, canonicalId: string } | { ok: false, reason: string, triedId?: string }>}
 */
export async function fetchCanonicalStravaActivityId(stravaId, token) {
    const triedId = normalizeStravaActivityId(stravaId);
    if (!triedId) return { ok: false, reason: 'missing_id' };
    if (!token) return { ok: false, reason: 'no_token', triedId };

    try {
        const resp = await fetch(
            `https://www.strava.com/api/v3/activities/${encodeURIComponent(triedId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (resp.status === 404) return { ok: false, reason: 'not_found', triedId };
        if (!resp.ok) return { ok: false, reason: 'api_error', triedId };
        const detail = await resp.json();
        const canonicalId = detail?.id != null ? String(detail.id) : triedId;
        return { ok: true, canonicalId };
    } catch {
        return { ok: false, reason: 'network', triedId };
    }
}

/**
 * Open Flyby in a new tab (direct navigation — preserves Strava cookie session better than about:blank hops).
 * @param {string} url
 * @returns {boolean}
 */
export function openFlybyViewerUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const anchor = document.createElement('a');
        anchor.href = url.trim();
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
        return true;
    } catch {
        try {
            const w = window.open(url, '_blank', 'noopener,noreferrer');
            return Boolean(w && !w.closed);
        } catch {
            return false;
        }
    }
}

/**
 * Open Strava Flyby for an activity.
 * When Strava is connected, validates the stored id via API before opening Flyby.
 * @param {string | number | { strava_id?: string | number, id?: string | number } | null | undefined} activityOrId
 * @param {{ getStravaToken?: () => Promise<string> }} [options]
 * @returns {Promise<boolean>}
 */
export async function openStravaFlybyForActivity(activityOrId, options = {}) {
    const { getStravaToken } = options;
    const isObj = activityOrId != null && typeof activityOrId === 'object';
    let stravaId = isObj
        ? resolveFlybyStravaId(activityOrId)
        : normalizeStravaActivityId(activityOrId);

    if (!stravaId) {
        notify(
            'This ride has no valid Strava activity id for Flyby. Link it in Activities → Strava, or check that strava_id is not the Intervals row id.',
            { variant: 'warning', durationMs: 12000 },
        );
        return false;
    }

    if (typeof getStravaToken === 'function') {
        try {
            const token = await getStravaToken();
            const check = await fetchCanonicalStravaActivityId(stravaId, token);
            if (check.ok) {
                stravaId = check.canonicalId;
            } else if (check.reason === 'not_found') {
                notify(
                    `Strava activity ${check.triedId} was not found for your account. Re-link this ride (Activities → Strava) or open it on Strava and use View Flybys there.`,
                    { variant: 'warning', durationMs: 14000 },
                );
                return false;
            }
        } catch {
            // Offline / token refresh issue — still attempt Flyby with best-effort id.
        }
    }

    const url = stravaFlybyUrl(stravaId);
    if (!url) return false;

    const opened = openFlybyViewerUrl(url);
    if (!opened) {
        notify(
            `Could not open Strava Flyby (popup blocked?). Allow popups for this site, or open manually:\n${url}`,
            { variant: 'warning', durationMs: 12000 },
        );
        return false;
    }

    return true;
}
