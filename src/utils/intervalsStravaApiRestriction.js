/**
 * Intervals.icu API cannot expose Strava-sourced activity metrics (Strava API ToS).
 * Web UI shows full data; REST returns date + source=STRAVA only.
 */

import { extractStravaId, normalizeStravaActivityId } from './strava.js';
import { fetchStravaActivitiesInRange } from './stravaLinkIntervalsFetch.js';
import { isIncludedStravaType, normalizeStravaActivity } from './stravaMatch.js';
import { mergeActivitiesIntervalsPrimary } from './mergeActivities.js';
import { normalizeIntervalsActivity } from './intervals.js';
import { enrichActivitiesWithBestPowerEfforts } from './enrichActivityBestPowers.js';

function payloadHasMetrics(item) {
    if (!item || typeof item !== 'object') return false;
    const num = (...vals) => {
        for (const v of vals) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    };
    if (num(item.moving_time, item.movingTime, item.icu_recording_time, item.elapsed_time) > 0) return true;
    if (num(item.distance, item.icu_distance) > 0) return true;
    if (num(item.icu_average_watts, item.average_watts, item.avg_power) > 0) return true;
    if (num(item.icu_weighted_avg_watts, item.weighted_average_watts, item.norm_power) > 0) return true;
    if (num(item.icu_training_load, item.training_load, item.load) > 0) return true;
    const name = String(item.name ?? item.title ?? '').trim();
    return !!(name && !/^untitled$/i.test(name));
}

function calendarYmd(value) {
    if (value == null || value === '') return null;
    const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
}

function intervalsApiIdLooksLikeActivity(id) {
    const s = String(id ?? '').trim();
    return /^(i)?\d+$/i.test(s);
}

/**
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
export function isStravaRestrictedIntervalsApiPayload(item) {
    if (!item || typeof item !== 'object') return false;
    const source = String(item.source || item.activity_source || '').trim().toUpperCase();
    if (source === 'STRAVA') return true;
    const note = String(item._note || item.note || '');
    if (/strava.*not available/i.test(note)) return true;
    const id = String(item.id ?? item.activity_id ?? '').trim();
    if (intervalsApiIdLooksLikeActivity(id) && !payloadHasMetrics(item)) return true;
    return false;
}

/**
 * @param {{ hasStravaConnection?: boolean, dateYmd?: string | null }} [opts]
 * @returns {string}
 */
export function buildStravaRestrictedIntervalsMessage(opts = {}) {
    const lines = [
        'This ride is stored on Intervals.icu from Strava. Intervals cannot share Strava metrics through their API (Strava privacy rules).',
        'The website still shows the ride, but Fetch & preview / Refresh selected only receive the date — not power, distance, or best efforts.',
    ];
    if (opts.hasStravaConnection) {
        lines.push(
            'Try again with the Strava activity URL in the optional second field, or paste the Strava URL as the primary link.',
        );
    } else {
        lines.push(
            'Connect Strava in Settings, then import using the Strava activity URL (primary or optional second field).',
        );
    }
    if (opts.dateYmd) {
        lines.push(`Ride date: ${opts.dateYmd}.`);
    }
    lines.push(
        'Best 1–60 min peaks are computed on Intervals.icu only — after Strava import you may still need to enter them manually in Edit activity, or re-import your Strava archive on Intervals.icu.',
    );
    return lines.join('\n');
}

function pickStravaListCandidate(sparseJson, stravaList) {
    const bikeRows = (stravaList || []).filter((row) =>
        isIncludedStravaType(String(row?.sport_type || row?.type || '').trim()),
    );
    if (bikeRows.length === 0) return null;

    const hintedSid = normalizeStravaActivityId(
        extractStravaId(sparseJson?.external_id) || sparseJson?.strava_id,
    );
    if (hintedSid) {
        const exact = bikeRows.find((row) => String(row.id) === hintedSid);
        if (exact) return exact;
    }

    if (bikeRows.length === 1) return bikeRows[0];

    const sparseStartMs = Date.parse(String(sparseJson?.start_date_local || sparseJson?.start_date || ''));
    if (!Number.isFinite(sparseStartMs)) return bikeRows[0];

    let best = bikeRows[0];
    let bestDelta = Infinity;
    for (const row of bikeRows) {
        const rowMs = Date.parse(String(row.start_date_local || row.start_date || ''));
        if (!Number.isFinite(rowMs)) continue;
        const delta = Math.abs(rowMs - sparseStartMs);
        if (delta < bestDelta) {
            bestDelta = delta;
            best = row;
        }
    }
    return best;
}

/**
 * Resolve Strava-side metrics when Intervals API is Strava-restricted.
 *
 * @param {object} sparseJson raw Intervals API payload
 * @param {{ stravaGetToken?: () => Promise<string>, stravaToken?: string | null, existingActivity?: object | null }} opts
 * @returns {Promise<object | null>} normalized Strava activity or null
 */
export async function resolveStravaSideForRestrictedIntervalsActivity(sparseJson, opts = {}) {
    let token = opts.stravaToken || null;
    if (!token && opts.stravaGetToken) {
        try {
            token = await opts.stravaGetToken();
        } catch {
            token = null;
        }
    }
    if (!token) return null;

    const fromExisting = normalizeStravaActivityId(opts.existingActivity?.strava_id);
    const fromPayload = normalizeStravaActivityId(
        extractStravaId(sparseJson?.external_id) || sparseJson?.strava_id,
    );
    const stravaId = fromExisting || fromPayload;

    if (stravaId) {
        const resp = await fetch(
            `https://www.strava.com/api/v3/activities/${encodeURIComponent(stravaId)}?include_all_efforts=true`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (resp.ok) {
            return normalizeStravaActivity(await resp.json());
        }
    }

    const dateYmd = calendarYmd(
        sparseJson?.start_date_local
        ?? sparseJson?.start_date
        ?? opts.existingActivity?.date,
    );
    if (!dateYmd) return null;

    const stravaList = await fetchStravaActivitiesInRange(token, dateYmd, dateYmd);
    const candidate = pickStravaListCandidate(sparseJson, stravaList);
    return candidate ? normalizeStravaActivity(candidate) : null;
}

/**
 * Merge Strava API metrics onto a sparse Intervals row (keeps Intervals id for updates).
 *
 * @param {object} sparseJson
 * @param {{ stravaGetToken?: () => Promise<string>, stravaToken?: string | null, existingActivity?: object | null, intervalsConfig?: object | null }} opts
 * @returns {Promise<object>}
 */
export async function mergeStravaApiIntoRestrictedIntervalsActivity(sparseJson, opts = {}) {
    const intervalsPrimary = normalizeIntervalsActivity(sparseJson);
    const stravaSide = await resolveStravaSideForRestrictedIntervalsActivity(sparseJson, opts);
    if (!stravaSide) {
        throw new Error(buildStravaRestrictedIntervalsMessage({
            hasStravaConnection: Boolean(opts.stravaToken || opts.stravaGetToken),
            dateYmd: calendarYmd(sparseJson?.start_date_local ?? sparseJson?.start_date),
        }));
    }
    let merged = mergeActivitiesIntervalsPrimary(intervalsPrimary, stravaSide);
    if (opts.intervalsConfig?.apiKey || opts.stravaToken || opts.stravaGetToken) {
        [merged] = await enrichActivitiesWithBestPowerEfforts([merged], {
            intervalsConfig: opts.intervalsConfig,
            stravaToken: opts.stravaToken,
            stravaGetToken: opts.stravaGetToken,
            maxFetches: 1,
            delayMs: 0,
        });
    }
    return merged;
}

/**
 * @param {object} normalizedActivity canonical site activity
 * @returns {boolean}
 */
export function siteActivityNeedsStravaMetricBackfill(normalizedActivity) {
    if (!normalizedActivity) return false;
    if (payloadHasMetrics(normalizedActivity)) return false;
    const sid = normalizeStravaActivityId(normalizedActivity.strava_id);
    if (sid) return true;
    return intervalsApiIdLooksLikeActivity(normalizedActivity.id);
}

function sparseJsonFromSiteActivity(act) {
    return {
        id: act.id,
        start_date_local: act.date,
        start_date: act.date,
        external_id: act.strava_id ? `strava:${act.strava_id}` : undefined,
        strava_id: act.strava_id,
        source: act.strava_id ? 'STRAVA' : undefined,
        name: act.title,
        type: act.type,
    };
}

/**
 * Fill distance/time/power from Strava when Intervals API returns Strava-restricted sparse rows.
 *
 * @param {object[]} activities normalized site activities
 * @param {{ stravaGetToken?: () => Promise<string>, stravaToken?: string | null, onProgress?: (msg: string) => void, intervalsConfig?: object | null }} [opts]
 * @returns {Promise<object[]>}
 */
export async function backfillStravaMetricsForSparseIntervalsActivities(activities, opts = {}) {
    const list = activities || [];
    if (list.length === 0) return [];

    let token = opts.stravaToken || null;
    if (!token && opts.stravaGetToken) {
        try {
            token = await opts.stravaGetToken();
        } catch {
            token = null;
        }
    }
    if (!token) return list.map((a) => ({ ...a }));

    const out = [];
    for (let i = 0; i < list.length; i += 1) {
        const act = list[i];
        if (!siteActivityNeedsStravaMetricBackfill(act)) {
            out.push({ ...act });
            continue;
        }
        opts.onProgress?.(`Strava metrics ${i + 1}/${list.length}…`);
        try {
            const merged = await mergeStravaApiIntoRestrictedIntervalsActivity(
                sparseJsonFromSiteActivity(act),
                { ...opts, stravaToken: token, existingActivity: act },
            );
            out.push(merged);
        } catch (err) {
            console.warn('[Strava backfill] sparse Intervals row failed:', act?.id, err?.message || err);
            out.push({ ...act });
        }
    }

    if (opts.intervalsConfig?.apiKey || token) {
        return enrichActivitiesWithBestPowerEfforts(out, {
            intervalsConfig: opts.intervalsConfig,
            stravaToken: token,
            stravaGetToken: opts.stravaGetToken,
            maxFetches: out.length,
            delayMs: 0,
        });
    }

    return out;
}
