/**
 * Coordinated post-normalize enrichment for synced activities.
 * Keeps rate limits and error isolation — drift remains capped / deferrable.
 */

import { enrichActivitiesWithLongDurationBests } from '../intervalsPowerCurveEnrich';
import { enrichActivitiesWithZoneTimes } from '../intervalsZoneTimesEnrich';
import { enrichActivitiesWithDecoupling } from '../decouplingStreamEnrich';
import { buildZoneTimesFields } from '../zoneTimes';

/**
 * Ensure zone times are mapped when raw Intervals fields are still on the activity.
 *
 * @param {object[]} activities
 * @returns {{ activities: object[], mappedCount: number }}
 */
export function mapZoneTimesOnActivities(activities) {
    let mappedCount = 0;
    const out = (activities || []).map((act) => {
        if (!act || typeof act !== 'object') return act;
        if (Array.isArray(act.power_zone_sec) && act.power_zone_sec.some((s) => Number(s) > 0)) {
            return act;
        }
        const patch = buildZoneTimesFields(act, { ftp: act.ftp, zone_times_ftp: act.zone_times_ftp });
        if (!patch.power_zone_sec && !patch.hr_zone_sec) return act;
        mappedCount += 1;
        return { ...act, ...patch };
    });
    return { activities: out, mappedCount };
}

/**
 * @param {object[]} activities
 * @param {{
 *   intervalsConfig?: object,
 *   profileFtp?: number,
 *   stravaToken?: string | null,
 *   deferDriftEnrich?: boolean,
 *   decouplingMaxFetches?: number,
 *   decouplingDelayMs?: number,
 *   zoneTimesMaxFetches?: number,
 *   zoneTimesDelayMs?: number,
 *   onProgress?: (message: string) => void,
 * }} [options]
 * @returns {Promise<{ activities: object[], stats: { zoneMapped: number, zoneTimesEnriched: number, powerCurveRan: boolean, driftRan: boolean } }>}
 */
export async function runActivityEnrichmentPipeline(activities, options = {}) {
    const onProgress = options.onProgress;
    let result = activities || [];
    const stats = {
        zoneMapped: 0,
        zoneTimesEnriched: 0,
        powerCurveRan: false,
        driftRan: false,
    };

    const fastMode = options.enrichmentMode === 'fast';

    const zonePass = mapZoneTimesOnActivities(result);
    result = zonePass.activities;
    stats.zoneMapped = zonePass.mappedCount;

    if (fastMode) {
        return { activities: result, stats };
    }

    if (options.intervalsConfig?.apiKey) {
        onProgress?.('Fetching zone times from activity details…');
        try {
            const zoneEnrich = await enrichActivitiesWithZoneTimes(result, options.intervalsConfig, {
                maxFetches: options.zoneTimesMaxFetches ?? 25,
                delayMs: options.zoneTimesDelayMs ?? 120,
            });
            result = zoneEnrich.activities;
            stats.zoneTimesEnriched = zoneEnrich.enrichedCount;
        } catch (err) {
            console.warn('[Enrichment] Zone times detail enrich failed:', err);
        }
    }

    if (options.intervalsConfig?.apiKey || options.intervalsConfig?.athleteId) {
        onProgress?.('Enriching power bests from Intervals power curves…');
        stats.powerCurveRan = true;
        try {
            result = await enrichActivitiesWithLongDurationBests(result, options.intervalsConfig);
        } catch (err) {
            console.warn('[Enrichment] Power curve enrich failed:', err);
        }
    }

    const profileFtp = Number(options.profileFtp) || 0;
    const canDrift = profileFtp > 0
        && !options.deferDriftEnrich
        && (options.intervalsConfig?.apiKey || options.stravaToken);

    if (canDrift) {
        onProgress?.('Analyzing HR drift from power+HR streams…');
        stats.driftRan = true;
        try {
            result = await enrichActivitiesWithDecoupling(result, {
                intervalsConfig: options.intervalsConfig,
                profileFtp,
                stravaToken: options.stravaToken || null,
                maxFetches: options.decouplingMaxFetches ?? 8,
                delayMs: options.decouplingDelayMs ?? 150,
                onProgress,
            });
        } catch (err) {
            console.warn('[Enrichment] Drift enrich failed:', err);
        }
    }

    return { activities: result, stats };
}
