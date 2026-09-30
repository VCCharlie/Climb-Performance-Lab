/**
 * Fill missing power/HR zone times from Intervals.icu activity detail endpoint.
 * The bulk activities list often omits icu_zone_times even with fields=; detail GET usually has them.
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { devLog } from './safeLog.js';
import { buildZoneTimesFields, hasZoneTimesData } from './zoneTimes.js';

/**
 * @param {object | null | undefined} act
 * @returns {boolean}
 */
export function activityNeedsZoneTimesEnrich(act) {
    if (!act || typeof act !== 'object') return false;
    if (!String(act.id || '').trim()) return false;
    if (hasZoneTimesData(act.power_zone_sec)) return false;
    const avgPower = Math.round(Number(act.avg_power) || 0);
    const normPower = Math.round(Number(act.norm_power) || 0);
    return avgPower > 0 || normPower > 0;
}

/**
 * @param {string} activityId
 * @param {{ athleteId?: string, apiKey?: string }} intervalsConfig
 * @returns {Promise<object | null>}
 */
export async function fetchIntervalsActivityDetail(activityId, intervalsConfig) {
    const id = String(activityId || '').trim();
    if (!id || !intervalsConfig?.apiKey) return null;

    const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);
    const url = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}`;

    const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authString}`,
            Accept: 'application/json',
        },
    });

    if (!resp.ok) {
        devLog(`[Intervals zone times] ${id}: HTTP ${resp.status}`);
        return null;
    }

    return resp.json();
}

/**
 * For rides with power but no zone times, fetch activity detail and map icu_zone_times.
 * Mutates and returns the same activity objects (shallow copy per row).
 *
 * @param {object[]} activities
 * @param {{ athleteId?: string, apiKey?: string }} intervalsConfig
 * @param {{ maxFetches?: number, delayMs?: number }} [opts]
 * @returns {Promise<{ activities: object[], enrichedCount: number }>}
 */
export async function enrichActivitiesWithZoneTimes(activities, intervalsConfig, opts = {}) {
    if (!activities?.length || !intervalsConfig?.apiKey) {
        return { activities: activities || [], enrichedCount: 0 };
    }

    const maxFetches = opts.maxFetches ?? 25;
    const delayMs = opts.delayMs ?? 120;
    let fetchCount = 0;
    let enrichedCount = 0;

    const out = activities.map((act) => ({ ...act }));

    const candidates = out
        .filter((act) => activityNeedsZoneTimesEnrich(act))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    for (const act of candidates) {
        if (fetchCount >= maxFetches) break;

        let detail;
        try {
            detail = await fetchIntervalsActivityDetail(act.id, intervalsConfig);
        } catch (err) {
            devLog(`[Intervals zone times] ${act.id}: ${err?.message || err}`);
            continue;
        }
        fetchCount += 1;

        if (!detail) continue;

        const patch = buildZoneTimesFields(detail, {
            ftp: act.ftp || detail.icu_ftp,
            zone_times_ftp: act.zone_times_ftp,
        });

        if (!patch.power_zone_sec && !patch.hr_zone_sec) continue;

        Object.assign(act, patch);
        enrichedCount += 1;

        if (delayMs > 0 && fetchCount < maxFetches) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    if (enrichedCount > 0) {
        devLog(
            `[Intervals zone times] Enriched ${enrichedCount} activit${enrichedCount === 1 ? 'y' : 'ies'} from detail endpoint`,
        );
    }

    return { activities: out, enrichedCount };
}
