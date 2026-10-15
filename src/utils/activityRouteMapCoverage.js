/**
 * Report which activities have a stored route polyline (Strava or Intervals).
 */

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
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function activityHasRoutePolyline(activity) {
    return getActivityRoutePolylineSource(activity) !== null;
}

/**
 * @typedef {{
 *   total: number,
 *   withRouteMap: number,
 *   withStravaMap: number,
 *   withIntervalsMap: number,
 *   missingRouteMap: number,
 *   missingActivities: Array<{ id: string, date?: string, title?: string, type?: string }>,
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
            missingActivities.push({
                id: String(act?.id ?? ''),
                date: act?.date != null ? String(act.date) : undefined,
                title: act?.title != null ? String(act.title) : undefined,
                type: act?.type != null ? String(act.type) : undefined,
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
