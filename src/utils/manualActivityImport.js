/**
 * Fetch a single activity from a Strava or Intervals.icu URL (for manual add / repair).
 */

import { normalizeIntervalsActivity } from './intervals';
import { normalizeStravaActivity } from './stravaMatch';
import { normalizeStravaActivityId } from './strava';
import { enrichActivityGearFromStrava } from './stravaGearEnrich';

const STRAVA_ACTIVITY_RE = /strava\.com\/(?:activities|activity)\/(\d+)/i;
const INTERVALS_ACTIVITY_RE = /intervals\.icu\/(?:i\d+\/)?activities\/(\d+)/i;

/**
 * @param {string} raw
 * @returns {{ kind: 'strava' | 'intervals', id: string } | null}
 */
export function parseActivityUrl(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const text = raw.trim();
    if (!text) return null;

    const sm = text.match(STRAVA_ACTIVITY_RE);
    if (sm?.[1]) return { kind: 'strava', id: sm[1] };

    const im = text.match(INTERVALS_ACTIVITY_RE);
    if (im?.[1]) return { kind: 'intervals', id: im[1] };

    return null;
}

/**
 * @param {string} stravaActivityId
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function fetchStravaActivityDetailAsSiteActivity(stravaActivityId, token) {
    const sid = normalizeStravaActivityId(stravaActivityId);
    if (!sid || !token) throw new Error('Invalid Strava activity id or missing token.');

    const resp = await fetch(
        `https://www.strava.com/api/v3/activities/${encodeURIComponent(sid)}?include_all_efforts=true`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (resp.status === 401) throw new Error('Strava session expired — reconnect Strava in Settings.');
    if (resp.status === 429) throw new Error('Strava rate limit (429) — wait a minute and try again.');
    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Strava error ${resp.status}${t ? `: ${t.slice(0, 120)}` : ''}`);
    }
    const json = await resp.json();
    return normalizeStravaActivity(json);
}

/**
 * @param {string} intervalsActivityId
 * @param {{ athleteId: string, apiKey: string }} intervalsConfig
 * @returns {Promise<object>}
 */
export async function fetchIntervalsActivityAsSiteActivity(intervalsActivityId, intervalsConfig) {
    const id = String(intervalsActivityId || '').replace(/\D/g, '');
    if (!id) throw new Error('Invalid Intervals.icu activity id.');
    if (!intervalsConfig?.apiKey) {
        throw new Error('Intervals.icu API key missing — add it in Settings.');
    }

    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}`;

    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    });

    if (resp.status === 401) throw new Error('Intervals.icu rejected the API key — check Settings.');
    if (resp.status === 404) throw new Error('Activity not found on Intervals.icu (wrong id or no access).');
    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Intervals.icu error ${resp.status}${t ? `: ${t.slice(0, 160)}` : ''}`);
    }

    const json = await resp.json();
    return normalizeIntervalsActivity(json);
}

/**
 * @param {string} urlOrText
 * @param {{ intervalsConfig?: object, stravaToken?: string | null }} opts
 * @returns {Promise<object>} one site-format activity
 */
export async function fetchSingleActivityFromUrl(urlOrText, opts = {}) {
    const parsed = parseActivityUrl(urlOrText);
    if (!parsed) {
        throw new Error(
            'Unrecognized link. Paste a URL like:\n'
            + '• https://www.strava.com/activities/12345678\n'
            + '• https://intervals.icu/activities/87654321',
        );
    }

    if (parsed.kind === 'strava') {
        if (!opts.stravaToken) {
            throw new Error('Connect Strava (Settings) to fetch activities by Strava URL.');
        }
        return fetchStravaActivityDetailAsSiteActivity(parsed.id, opts.stravaToken);
    }

    return fetchIntervalsActivityAsSiteActivity(parsed.id, opts.intervalsConfig || {});
}

/**
 * Strava detail + optional gear/KOM enrich when token is available.
 * @param {string} urlOrText
 * @param {{ intervalsConfig?: object, stravaToken?: string | null }} opts
 */
export async function fetchAndEnrichSingleActivityFromUrl(urlOrText, opts = {}) {
    let act = await fetchSingleActivityFromUrl(urlOrText, opts);
    if (act.strava_id && opts.stravaToken) {
        try {
            act = await enrichActivityGearFromStrava(act, null, opts.stravaToken);
        } catch {
            /* keep base activity */
        }
    }
    return act;
}
