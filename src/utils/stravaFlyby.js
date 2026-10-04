/**
 * Strava Flyby launch helpers.
 * Flyby viewer loads match data from nene.strava.com with browser cookies (withCredentials),
 * not the app's OAuth bearer token. Wrong activity IDs return {} → "No flyby data found."
 */

import { notify } from './notify.js';
import { extractStravaId, normalizeStravaActivityId, stravaFlybyUrl } from './strava.js';

/**
 * Intervals row id accidentally copied into strava_id (same numeric id on both fields).
 * @param {object | null | undefined} activity
 * @param {string} normalizedStravaId
 * @returns {boolean}
 */
export function isIntervalsRowIdMislinkedAsStrava(activity, normalizedStravaId) {
    if (!activity?.id || !normalizedStravaId) return false;
    const rawId = String(activity.id).trim();
    const rawStrava = String(activity.strava_id ?? '').trim();
    if (rawStrava && rawId === rawStrava) return true;
    if (/^\d+$/.test(rawId) && rawId === normalizedStravaId) return true;
    return false;
}

/**
 * Resolve a numeric Strava activity id for external links / Flyby.
 * @param {object | null | undefined} activity
 * @returns {string | null}
 */
export function resolveFlybyStravaId(activity) {
    if (!activity) return null;

    const candidates = [
        activity.strava_id,
        extractStravaId(activity.external_id),
        extractStravaId(activity.externalId),
    ];

    for (const candidate of candidates) {
        if (candidate == null || candidate === '') continue;
        const id = normalizeStravaActivityId(candidate);
        if (!id) continue;
        if (
            candidate === activity.strava_id
            && isIntervalsRowIdMislinkedAsStrava(activity, id)
        ) {
            continue;
        }
        return id;
    }

    return null;
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
 * Open Flyby in a new tab (synchronous — must run inside the user click handler).
 * @param {string} url
 * @returns {boolean}
 */
export function openFlybyViewerUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;

    try {
        const w = window.open('about:blank', '_blank');
        if (w) {
            w.opener = null;
            w.location.href = trimmed;
            return true;
        }
    } catch {
        // fall through
    }
    try {
        const w = window.open(trimmed, '_blank', 'noopener,noreferrer');
        return Boolean(w && !w.closed);
    } catch {
        return false;
    }
}

/**
 * Reserve a new tab while the browser still treats the call as a user gesture.
 * @returns {Window | null}
 */
function openFlybyPlaceholderTab() {
    if (typeof window === 'undefined') return null;
    try {
        const w = window.open('about:blank', '_blank');
        if (w) w.opener = null;
        return w;
    } catch {
        return null;
    }
}

/**
 * @param {Window | null | undefined} tab
 * @param {string} url
 * @returns {boolean}
 */
function navigateFlybyTab(tab, url) {
    if (tab && !tab.closed) {
        try {
            tab.location.href = url;
            return true;
        } catch {
            try {
                tab.close();
            } catch {
                /* ignore */
            }
        }
    }
    return openFlybyViewerUrl(url);
}

/**
 * Open Strava Flyby for an activity.
 * Optional OAuth preflight when Strava is connected (does not replace strava.com cookies in Flyby).
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
            'This ride has no valid Strava activity id for Flyby. Run Strava sync in Activities, or fix a wrong link (Intervals row id copied as strava_id).',
            { variant: 'warning', durationMs: 12000 },
        );
        return false;
    }

    const needsAsyncCheck = typeof getStravaToken === 'function';
    const placeholderTab = needsAsyncCheck ? openFlybyPlaceholderTab() : null;
    let apiPreflightFailed = false;

    if (needsAsyncCheck) {
        try {
            const token = await getStravaToken();
            const check = await fetchCanonicalStravaActivityId(stravaId, token);
            if (check.ok) {
                stravaId = check.canonicalId;
            } else if (check.reason === 'not_found') {
                apiPreflightFailed = true;
            }
        } catch {
            // Offline / token refresh issue — still attempt Flyby with best-effort id.
        }
    }

    const url = stravaFlybyUrl(stravaId);
    if (!url) {
        try {
            placeholderTab?.close();
        } catch {
            /* ignore */
        }
        return false;
    }

    const opened = needsAsyncCheck
        ? navigateFlybyTab(placeholderTab, url)
        : openFlybyViewerUrl(url);

    if (!opened) {
        notify(
            `Could not open Strava Flyby (popup blocked?). Allow popups for this site, or open manually:\n${url}`,
            { variant: 'warning', durationMs: 12000 },
        );
        return false;
    }

    if (apiPreflightFailed) {
        notify(
            `Strava API could not verify activity ${stravaId}. Flyby opened anyway — log in at strava.com in that tab. Empty playback usually means a wrong id: re-link via Activities → Strava.`,
            { variant: 'warning', durationMs: 16000 },
        );
    }

    return true;
}
