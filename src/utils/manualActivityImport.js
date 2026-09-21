/**
 * Fetch a single activity from a Strava or Intervals.icu URL (for manual add / repair).
 */

import { normalizeIntervalsActivity, buildIntervalsActivitiesListUrl, normalizeIntervalsActivityFromAny } from './intervals';
import { enrichActivitiesWithBestPowerEfforts } from './enrichActivityBestPowers';
import { normalizeStravaActivity } from './stravaMatch';
import { normalizeStravaActivityId } from './strava';
import { enrichActivityGearFromStrava } from './stravaGearEnrich';
import { mergeActivitiesIntervalsPrimary } from './mergeActivities';
import { fetchWithTimeout } from './fetchWithTimeout';
import {
    isStravaRestrictedIntervalsApiPayload,
    mergeStravaApiIntoRestrictedIntervalsActivity,
    buildStravaRestrictedIntervalsMessage,
} from './intervalsStravaApiRestriction';

const STRAVA_ACTIVITY_RE = /strava\.com\/(?:activities|activity)\/(\d+)/i;
/** Intervals: /activities/123, /activities/i123… (API id is often `i` + digits — do not strip the `i`). */
const INTERVALS_ACTIVITY_RE = /intervals\.icu\/(?:i\d+\/)?activities\/(i\d+|\d+)/i;

/**
 * Resolve Strava OAuth token from opts.stravaToken or opts.stravaGetToken().
 * @param {{ stravaToken?: string | null, stravaGetToken?: () => Promise<string> }} opts
 * @returns {Promise<string | null>}
 */
async function resolveStravaToken(opts = {}) {
    if (opts.stravaToken) return opts.stravaToken;
    if (!opts.stravaGetToken) return null;
    try {
        const token = await opts.stravaGetToken();
        return token || null;
    } catch {
        throw new Error('Strava session expired — reconnect in Settings.');
    }
}

async function enrichActBestPowers(act, intervalsConfig, opts = {}) {
    let token = opts.stravaToken || null;
    if (!token && opts.stravaGetToken) {
        try {
            token = await opts.stravaGetToken();
        } catch {
            token = null;
        }
    }
    const [enriched] = await enrichActivitiesWithBestPowerEfforts([act], {
        intervalsConfig,
        stravaToken: token,
        stravaGetToken: opts.stravaGetToken,
        maxFetches: 1,
        delayMs: 0,
    });
    return enriched;
}

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

    const resp = await fetchWithTimeout(
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
 * Build candidate Intervals.icu REST ids for a URL or stored id.
 * Web URLs often use bare numeric ids (970385547); the API expects i970385547.
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function buildIntervalsApiActivityIdCandidates(raw) {
    const s = String(raw || '').trim();
    const candidates = [];
    const push = (id) => {
        const v = String(id || '').trim();
        if (v && !candidates.includes(v)) candidates.push(v);
    };

    if (/^i\d+$/i.test(s)) {
        const digits = s.slice(1).replace(/\D/g, '');
        push(`i${digits}`);
        if (digits) push(digits);
        return candidates;
    }

    const digits = s.replace(/\D/g, '');
    if (/^\d+$/.test(digits)) {
        push(`i${digits}`);
        push(digits);
    }
    return candidates;
}

/**
 * Intervals.icu activity ids in URLs are either numeric or `i` + digits.
 * Prefer the API-canonical `i`-prefixed form.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeIntervalsUrlActivityIdForApi(raw) {
    return buildIntervalsApiActivityIdCandidates(raw)[0] || '';
}

/**
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
export function isSubstantiveIntervalsApiPayload(item) {
    if (!item || typeof item !== 'object') return false;
    const num = (...vals) => {
        for (const v of vals) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    };
    if (num(item.moving_time, item.movingTime, item.icu_recording_time, item.elapsed_time, item.elapsedTime) > 0) {
        return true;
    }
    if (num(item.distance, item.icu_distance) > 0) return true;
    if (num(item.icu_average_watts, item.average_watts, item.device_watts, item.avg_power) > 0) return true;
    if (num(item.icu_weighted_avg_watts, item.weighted_average_watts, item.norm_power) > 0) return true;
    if (num(item.icu_training_load, item.training_load, item.load) > 0) return true;
    const name = String(item.name ?? item.title ?? '').trim();
    return !!(name && !/^untitled$/i.test(name));
}

/**
 * @param {string | number | null | undefined} a
 * @param {string | number | null | undefined} b
 * @returns {boolean}
 */
export function intervalsActivityIdsEquivalent(a, b) {
    const da = String(a ?? '').trim().replace(/^i/i, '');
    const db = String(b ?? '').trim().replace(/^i/i, '');
    return !!(da && db && da === db);
}

function extractCalendarYmdFromIntervalsPayload(item) {
    const raw = item?.start_date_local ?? item?.start_date ?? item?.startDate ?? item?.date;
    if (!raw) return null;
    const str = String(raw);
    const m = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
}

async function fetchIntervalsActivityRawJson(activityId, intervalsConfig) {
    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = `https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}`;
    const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    });
    return { resp, activityId };
}

async function fetchIntervalsActivityFromListByDate(activityId, dateYmd, intervalsConfig) {
    if (!dateYmd || !intervalsConfig?.apiKey) return null;
    const athleteId = intervalsConfig.athleteId || '0';
    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = buildIntervalsActivitiesListUrl(athleteId, dateYmd, dateYmd);
    const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    });
    if (!resp.ok) return null;
    const list = await resp.json();
    if (!Array.isArray(list)) return null;
    return list.find((row) => intervalsActivityIdsEquivalent(row?.id ?? row?.activity_id, activityId)) || null;
}

/**
 * @param {string} intervalsActivityId
 * @param {{ athleteId: string, apiKey: string }} intervalsConfig
 * @param {{ stravaGetToken?: () => Promise<string>, stravaToken?: string | null, existingActivity?: object | null }} [opts]
 * @returns {Promise<object>}
 */
export async function fetchIntervalsActivityAsSiteActivity(intervalsActivityId, intervalsConfig, opts = {}) {
    const candidates = buildIntervalsApiActivityIdCandidates(intervalsActivityId);
    if (!candidates.length) throw new Error('Invalid Intervals.icu activity id.');
    if (!intervalsConfig?.apiKey) {
        throw new Error('Intervals.icu API key missing — add it in Settings.');
    }

    let lastError = null;
    let sparsePayload = null;
    let sparseId = null;

    for (const candidateId of candidates) {
        let resp;
        try {
            ({ resp } = await fetchIntervalsActivityRawJson(candidateId, intervalsConfig));
        } catch (err) {
            lastError = err;
            continue;
        }

        if (resp.status === 401) throw new Error('Intervals.icu rejected the API key — check Settings.');
        if (resp.status === 404) {
            lastError = new Error('Activity not found on Intervals.icu (wrong id or no access).');
            continue;
        }
        if (!resp.ok) {
            const t = await resp.text().catch(() => '');
            lastError = new Error(`Intervals.icu error ${resp.status}${t ? `: ${t.slice(0, 160)}` : ''}`);
            continue;
        }

        const json = await resp.json();
        if (isSubstantiveIntervalsApiPayload(json)) {
            let act = normalizeIntervalsActivity(json);
            act = await enrichActBestPowers(act, intervalsConfig, opts);
            return act;
        }

        if (isStravaRestrictedIntervalsApiPayload(json)) {
            try {
                let act = await mergeStravaApiIntoRestrictedIntervalsActivity(json, {
                    ...opts,
                    intervalsConfig,
                });
                act = await enrichActBestPowers(act, intervalsConfig, opts);
                return act;
            } catch (err) {
                lastError = err;
            }
        }

        if (!sparsePayload) {
            sparsePayload = json;
            sparseId = candidateId;
        }
    }

    if (sparsePayload) {
        const dateYmd = extractCalendarYmdFromIntervalsPayload(sparsePayload);
        const listRow = await fetchIntervalsActivityFromListByDate(
            intervalsActivityId,
            dateYmd,
            intervalsConfig,
        );
        if (listRow && isSubstantiveIntervalsApiPayload(listRow)) {
            let act = normalizeIntervalsActivityFromAny(listRow);
            act = await enrichActBestPowers(act, intervalsConfig, opts);
            return act;
        }

        if (listRow && isStravaRestrictedIntervalsApiPayload(listRow)) {
            try {
                let act = await mergeStravaApiIntoRestrictedIntervalsActivity(listRow, {
                    ...opts,
                    intervalsConfig,
                });
                act = await enrichActBestPowers(act, intervalsConfig, opts);
                return act;
            } catch (err) {
                lastError = err;
            }
        }

        if (sparsePayload && isStravaRestrictedIntervalsApiPayload(sparsePayload)) {
            try {
                let act = await mergeStravaApiIntoRestrictedIntervalsActivity(sparsePayload, {
                    ...opts,
                    intervalsConfig,
                });
                act = await enrichActBestPowers(act, intervalsConfig, opts);
                return act;
            } catch (err) {
                throw err;
            }
        }

        let act = normalizeIntervalsActivity(sparsePayload);
        act = await enrichActBestPowers(act, intervalsConfig, opts);
        if (isStravaRestrictedIntervalsApiPayload(sparsePayload)) {
            throw lastError || new Error(
                buildStravaRestrictedIntervalsMessage({
                    hasStravaConnection: Boolean(opts.stravaToken || opts.stravaGetToken),
                    dateYmd: extractCalendarYmdFromIntervalsPayload(sparsePayload),
                }),
            );
        }
        if (!isSubstantiveIntervalsApiPayload(sparsePayload) && sparseId) {
            console.warn(
                `[Intervals URL fetch] Activity ${sparseId} returned sparse metrics; `
                + 'check the Intervals API id or re-sync via Refresh selected.',
            );
        }
        return act;
    }

    throw lastError || new Error('Activity not found on Intervals.icu (wrong id or no access).');
}

/**
 * @param {string} urlOrText
 * @param {{ intervalsConfig?: object, stravaToken?: string | null, stravaGetToken?: () => Promise<string> }} opts
 * @returns {Promise<object>} one site-format activity
 */
export async function fetchSingleActivityFromUrl(urlOrText, opts = {}) {
    const parsed = parseActivityUrl(urlOrText);
    if (!parsed) {
        throw new Error(
            'Unrecognized link. Paste a URL like:\n'
            + '• https://www.strava.com/activities/12345678\n'
            + '• https://intervals.icu/activities/87654321 or …/activities/i53534754',
        );
    }

    if (parsed.kind === 'strava') {
        const stravaToken = await resolveStravaToken(opts);
        if (!stravaToken) {
            throw new Error('Connect Strava (Settings) to fetch activities by Strava URL.');
        }
        const act = await fetchStravaActivityDetailAsSiteActivity(parsed.id, stravaToken);
        return enrichActBestPowers(act, opts.intervalsConfig || {}, { ...opts, stravaToken });
    }

    return fetchIntervalsActivityAsSiteActivity(parsed.id, opts.intervalsConfig || {}, {
        stravaGetToken: opts.stravaGetToken,
        stravaToken: opts.stravaToken,
    });
}

/**
 * Strava detail + optional gear/KOM enrich when token is available.
 * @param {string} urlOrText
 * @param {{ intervalsConfig?: object, stravaToken?: string | null, stravaGetToken?: () => Promise<string> }} opts
 */
export async function fetchAndEnrichSingleActivityFromUrl(urlOrText, opts = {}) {
    const parsed = parseActivityUrl(urlOrText);
    let resolvedOpts = opts;
    if (parsed?.kind === 'strava') {
        const stravaToken = await resolveStravaToken(opts);
        if (!stravaToken) {
            throw new Error('Connect Strava (Settings) to fetch activities by Strava URL.');
        }
        resolvedOpts = { ...opts, stravaToken };
    }

    let act = await fetchSingleActivityFromUrl(urlOrText, resolvedOpts);
    if (act.strava_id && resolvedOpts.stravaToken) {
        try {
            act = await enrichActivityGearFromStrava(act, null, resolvedOpts.stravaToken);
        } catch {
            /* keep base activity */
        }
    }
    return act;
}

/**
 * Fetch primary + optional second URL and merge (Intervals id wins).
 * Primary and secondary must be different services (Strava + Intervals).
 *
 * @param {string} primaryUrl
 * @param {string} [secondaryUrl] - trimmed; empty = single-URL behaviour
 * @param {{ intervalsConfig?: object, stravaToken?: string | null, stravaGetToken?: () => Promise<string> }} opts
 */
export async function fetchMergedActivityFromPrimaryAndOptionalUrl(primaryUrl, secondaryUrl, opts = {}) {
    const primary = (primaryUrl || '').trim();
    if (!primary) {
        throw new Error('Paste a primary activity URL first.');
    }

    const sec = (secondaryUrl || '').trim();
    if (!sec) {
        return fetchAndEnrichSingleActivityFromUrl(primary, opts);
    }

    const a = parseActivityUrl(primary);
    const b = parseActivityUrl(sec);
    if (!a) throw new Error('Primary URL is not a valid Strava or Intervals.icu activity link.');
    if (!b) throw new Error('Optional second URL is not a valid Strava or Intervals.icu activity link.');
    if (a.kind === b.kind) {
        throw new Error('Primary and optional URL must be from different services (one Strava, one Intervals.icu).');
    }

    let stravaToken = null;
    if (a.kind === 'strava' || b.kind === 'strava') {
        stravaToken = await resolveStravaToken(opts);
        if (!stravaToken) {
            throw new Error('Connect Strava (Settings) to fetch the Strava side of a merged import.');
        }
    }

    let intervalsAct;
    let stravaAct;
    if (a.kind === 'intervals') {
        intervalsAct = await fetchIntervalsActivityAsSiteActivity(a.id, opts.intervalsConfig || {}, {
            stravaGetToken: opts.stravaGetToken,
            stravaToken: stravaToken,
        });
        stravaAct = await fetchStravaActivityDetailAsSiteActivity(b.id, stravaToken);
    } else {
        stravaAct = await fetchStravaActivityDetailAsSiteActivity(a.id, stravaToken);
        intervalsAct = await fetchIntervalsActivityAsSiteActivity(b.id, opts.intervalsConfig || {}, {
            stravaGetToken: opts.stravaGetToken,
            stravaToken: stravaToken,
        });
    }

    const merged = mergeActivitiesIntervalsPrimary(intervalsAct, stravaAct);
    if (stravaToken && merged.strava_id) {
        try {
            return await enrichActivityGearFromStrava(merged, null, stravaToken);
        } catch {
            return merged;
        }
    }
    return merged;
}
