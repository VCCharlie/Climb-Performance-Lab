/**
 * Report which activities have a stored route polyline (Strava or Intervals).
 */

import { classifyMissingRouteMapBackfillAction } from './intervalsMapBackfillOutcomes.js';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function hasNonEmptyRoutePolyline(value) {
    return value != null && String(value).trim() !== '';
}

/**
 * @param {object | null | undefined} activity
 * @returns {'strava' | 'intervals' | null}
 */
export function getActivityRoutePolylineSource(activity) {
    if (!activity || typeof activity !== 'object') return null;
    if (hasNonEmptyRoutePolyline(activity.strava_map)) return 'strava';
    if (hasNonEmptyRoutePolyline(activity.intervals_map)) return 'intervals';
    return null;
}

/**
 * Encoded Google polyline for map/profiler (Strava first, then Intervals).
 *
 * @param {object | null | undefined} activity
 * @returns {string | null}
 */
export function getActivityRoutePolyline(activity) {
    if (!activity || typeof activity !== 'object') return null;
    if (hasNonEmptyRoutePolyline(activity.strava_map)) {
        return String(activity.strava_map).trim();
    }
    if (hasNonEmptyRoutePolyline(activity.intervals_map)) {
        return String(activity.intervals_map).trim();
    }
    return null;
}

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function activityHasRoutePolyline(activity) {
    return getActivityRoutePolylineSource(activity) !== null;
}

/** @typedef {'cpl' | 'intervals' | 'strava'} ClimbLogbookRouteSource */

/**
 * Route polyline for climb logbook server matching.
 * - `cpl`: stored polyline in Firestore (Strava map first, then Intervals map)
 * - `strava`: only `strava_map`
 * - `intervals`: only `intervals_map`
 *
 * @param {object | null | undefined} activity
 * @param {ClimbLogbookRouteSource} source
 * @returns {string | null}
 */
export function getActivityRoutePolylineForSource(activity, source) {
    if (!activity || typeof activity !== 'object') return null;
    if (source === 'strava') {
        return hasNonEmptyRoutePolyline(activity.strava_map)
            ? String(activity.strava_map).trim()
            : null;
    }
    if (source === 'intervals') {
        return hasNonEmptyRoutePolyline(activity.intervals_map)
            ? String(activity.intervals_map).trim()
            : null;
    }
    return getActivityRoutePolyline(activity);
}

/**
 * @param {object | null | undefined} activity
 * @param {ClimbLogbookRouteSource} source
 * @returns {boolean}
 */
export function activityHasRoutePolylineForSource(activity, source) {
    return getActivityRoutePolylineForSource(activity, source) != null;
}

/**
 * @typedef {{
 *   total: number,
 *   withRouteMap: number,
 *   withStravaMap: number,
 *   withIntervalsMap: number,
 *   missingRouteMap: number,
 *   missingActivities: Array<{
 *     id: string,
 *     date?: string,
 *     title?: string,
 *     type?: string,
 *     mapBackfillHint?: string,
 *     mapBackfillAction?: 'intervals_fetch' | 'strava_enrich' | 'unavailable',
 *   }>,
 * }} RouteMapCoverageSummary
 */

/**
 * @param {object[] | null | undefined} activities
 * @returns {RouteMapCoverageSummary}
 */
export function summarizeActivityRouteMapCoverage(activities) {
    const list = Array.isArray(activities) ? activities : [];
    let withStravaMap = 0;
    let withIntervalsMap = 0;
    /** @type {RouteMapCoverageSummary['missingActivities']} */
    const missingActivities = [];

    for (const act of list) {
        const source = getActivityRoutePolylineSource(act);
        if (source === 'strava') {
            withStravaMap += 1;
        } else if (source === 'intervals') {
            withIntervalsMap += 1;
        } else {
            const classified = classifyMissingRouteMapBackfillAction(act);
            missingActivities.push({
                id: String(act?.id ?? ''),
                date: act?.date != null ? String(act.date) : undefined,
                title: act?.title != null ? String(act.title) : undefined,
                type: act?.type != null ? String(act.type) : undefined,
                mapBackfillAction: classified.action,
                mapBackfillHint: classified.action === 'intervals_fetch'
                    ? 'Intervals.icu activity — use Fetch map on this row or the bulk Intervals button below'
                    : classified.message,
            });
        }
    }

    const withRouteMap = withStravaMap + withIntervalsMap;

    return {
        total: list.length,
        withRouteMap,
        withStravaMap,
        withIntervalsMap,
        missingRouteMap: list.length - withRouteMap,
        missingActivities,
    };
}

/**
 * @param {RouteMapCoverageSummary} summary
 * @returns {string}
 */
export function formatRouteMapCoverageSummary(summary) {
    const s = summary || summarizeActivityRouteMapCoverage([]);
    const pct = s.total > 0 ? Math.round((s.withRouteMap / s.total) * 100) : 0;
    return [
        `Route map coverage: ${s.withRouteMap}/${s.total} (${pct}%)`,
        `  strava_map: ${s.withStravaMap}`,
        `  intervals_map only: ${s.withIntervalsMap}`,
        `  missing both: ${s.missingRouteMap}`,
    ].join('\n');
}

const UTF8_BOM = '\uFEFF';

const MISSING_EXPORT_COLUMNS = [
    { key: 'id', label: 'Activity ID' },
    { key: 'date', label: 'Date' },
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
];

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/**
 * @param {RouteMapCoverageSummary['missingActivities']} rows
 * @returns {string}
 */
export function missingRouteActivitiesToCsv(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const header = MISSING_EXPORT_COLUMNS.map((c) => csvEscape(c.label)).join(',');
    const body = list.map((row) => MISSING_EXPORT_COLUMNS.map((c) => csvEscape(row[c.key])).join(','));
    return [header, ...body].join('\r\n');
}

/**
 * @param {RouteMapCoverageSummary} summary
 * @returns {object}
 */
export function missingRouteActivitiesToExportJson(summary) {
    const s = summary || summarizeActivityRouteMapCoverage([]);
    return {
        schema: 'cpl.routeMapCoverage.missing.v1',
        generatedAt: new Date().toISOString(),
        totals: {
            total: s.total,
            withRouteMap: s.withRouteMap,
            missingRouteMap: s.missingRouteMap,
        },
        missingActivities: s.missingActivities,
    };
}

function triggerBrowserDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function exportFilename(ext) {
    const day = new Date().toISOString().split('T')[0];
    return `climb_lab_missing_route_maps_${day}.${ext}`;
}

/**
 * @param {RouteMapCoverageSummary} summary
 */
export function downloadMissingRouteActivitiesCsv(summary) {
    const csv = missingRouteActivitiesToCsv(summary?.missingActivities);
    const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' });
    triggerBrowserDownload(blob, exportFilename('csv'));
}

/**
 * @param {RouteMapCoverageSummary} summary
 */
export function downloadMissingRouteActivitiesJson(summary) {
    const payload = missingRouteActivitiesToExportJson(summary);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    triggerBrowserDownload(blob, exportFilename('json'));
}
