/**
 * Node-safe Intervals enrichment for nightly sync (no browser-only pipeline imports).
 */
import { buildZoneTimesFields } from './zoneTimes.js';
import { enrichActivitiesWithZoneTimes } from './intervalsZoneTimesEnrich.js';
import { enrichActivitiesWithLongDurationBests } from './intervalsPowerCurveEnrich.js';
import { enrichActivitiesWithIntervalsMapPolylines } from './intervalsMapEnrich.js';

/**
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
 *   isFullSync: boolean,
 *   intervalsConfig: object | null,
 *   enrichLimits: { zoneTimesMaxFetches: number, powerCurveMaxFetches: number },
 *   onProgress?: (message: string) => void,
 * }} options
 */
export async function enrichIntervalsActivitiesForNightlySync(activities, options) {
    const onProgress = options.onProgress;
    let result = activities || [];
    const stats = { zoneMapped: 0, zoneTimesEnriched: 0, powerCurveRan: false, intervalsMapsAdded: 0 };

    const zonePass = mapZoneTimesOnActivities(result);
    result = zonePass.activities;
    stats.zoneMapped = zonePass.mappedCount;

    if (options.intervalsConfig?.apiKey) {
        onProgress?.('Fetching route maps from Intervals.icu…');
        try {
            const mapPass = await enrichActivitiesWithIntervalsMapPolylines(result, options.intervalsConfig, {
                concurrency: 2,
                delayMs: 120,
                onProgress,
            });
            result = mapPass.activities;
            stats.intervalsMapsAdded = mapPass.mapsAdded;
        } catch (err) {
            console.warn('[Nightly enrich] Route maps failed:', err);
        }
    }

    if (!options.isFullSync || !options.intervalsConfig?.apiKey) {
        return { activities: result, stats };
    }

    const zoneTimesMaxFetches = options.enrichLimits?.zoneTimesMaxFetches ?? 0;
    if (zoneTimesMaxFetches > 0) {
        onProgress?.('Fetching zone times from activity details…');
        try {
            const zoneEnrich = await enrichActivitiesWithZoneTimes(result, options.intervalsConfig, {
                maxFetches: zoneTimesMaxFetches,
                delayMs: 120,
            });
            result = zoneEnrich.activities;
            stats.zoneTimesEnriched = zoneEnrich.enrichedCount;
        } catch (err) {
            console.warn('[Nightly enrich] Zone times failed:', err);
        }
    }

    const powerCurveMaxFetches = options.enrichLimits?.powerCurveMaxFetches ?? 0;
    if (powerCurveMaxFetches > 0) {
        onProgress?.('Enriching power bests from Intervals power curves…');
        stats.powerCurveRan = true;
        try {
            result = await enrichActivitiesWithLongDurationBests(result, options.intervalsConfig, {
                maxFetches: powerCurveMaxFetches,
            });
        } catch (err) {
            console.warn('[Nightly enrich] Power curve failed:', err);
        }
    }

    return { activities: result, stats };
}
