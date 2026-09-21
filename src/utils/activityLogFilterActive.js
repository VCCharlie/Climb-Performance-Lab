import { ACTIVITY_SPORT_TYPE_FILTER_OPTIONS } from './activitySportTypeFilters';

const SPORT_LABEL_BY_TYPE = Object.fromEntries(
    ACTIVITY_SPORT_TYPE_FILTER_OPTIONS.map(({ type, label }) => [type, label]),
);

/**
 * Human-readable labels for currently active Activity Log filters (for analytics bar).
 * @param {Record<string, unknown>} state
 * @returns {string[]}
 */
export function buildActivityLogFilterLabels(state = {}) {
    const labels = [];

    if (state.search && String(state.search).trim()) {
        labels.push(`Search: "${String(state.search).trim()}"`);
    }
    if (state.indoorFilter === 'indoor') labels.push('Indoor');
    if (state.indoorFilter === 'outdoor') labels.push('Outdoor');
    if (state.thisWeekOnly) labels.push('This week');
    if (state.rollingDays === 7) labels.push('Last 7d');
    if (state.rollingDays === 14) labels.push('Last 14d');
    if (state.rollingDays === 30) labels.push('Last 30d');
    if (state.withPowerOnly) labels.push('With power');
    if (state.noPowerOnly) labels.push('No power');
    if (state.highLoadOnly) labels.push('High load');
    if (state.hasTagOnly) labels.push('Has tag');
    if (state.stravaLinkedOnly) labels.push('Strava link');
    if (state.noStravaLinkOnly) labels.push('No Strava link');
    if (state.possibleDuplicatesOnly) labels.push('Possible duplicates');
    if (state.longRideOnly) labels.push('Long ride');
    if (state.missingHrOnly) labels.push('No HR');
    if (state.minTss !== '' && state.minTss != null) labels.push(`TSS > ${state.minTss}`);
    if (state.filterGearId) labels.push('Bike filter');

    for (const type of state.activeSportTypes || []) {
        labels.push(SPORT_LABEL_BY_TYPE[type] || type);
    }

    if (state.metricRangeActive) labels.push('Metric ranges');
    if (state.singleDayFilterYmd) labels.push('Single day');
    if (state.logDateRangeFilter?.startYmd && state.logDateRangeFilter?.endYmd) {
        labels.push('Date range');
    }
    if (state.isolateActivityId) labels.push('Single activity');

    return labels;
}

/**
 * @param {Record<string, unknown>} state
 * @param {object[]} filteredActivities
 * @param {object[]} allActivities
 * @returns {boolean}
 */
export function isActivityLogFilterActive(state, filteredActivities, allActivities) {
    if (buildActivityLogFilterLabels(state).length > 0) return true;
    const filtered = filteredActivities?.length ?? 0;
    const total = allActivities?.length ?? 0;
    return total > 0 && filtered !== total;
}

/**
 * Build filter state object from Activity Log filter bar props + route-level filters.
 * @param {Record<string, unknown>} filterBarProps
 * @param {{ singleDayFilterYmd?: string | null, logDateRangeFilter?: { startYmd?: string, endYmd?: string } | null, isolateActivityId?: string | null }} [extras]
 * @returns {Record<string, unknown>}
 */
export function buildActivityLogFilterStateFromBarProps(filterBarProps = {}, extras = {}) {
    return {
        search: filterBarProps.search,
        indoorFilter: filterBarProps.indoorFilter,
        thisWeekOnly: filterBarProps.thisWeekOnly,
        rollingDays: filterBarProps.rollingDays,
        withPowerOnly: filterBarProps.withPowerOnly,
        noPowerOnly: filterBarProps.noPowerOnly,
        highLoadOnly: filterBarProps.highLoadOnly,
        hasTagOnly: filterBarProps.hasTagOnly,
        stravaLinkedOnly: filterBarProps.stravaLinkedOnly,
        noStravaLinkOnly: filterBarProps.noStravaLinkOnly,
        possibleDuplicatesOnly: filterBarProps.possibleDuplicatesOnly,
        longRideOnly: filterBarProps.longRideOnly,
        missingHrOnly: filterBarProps.missingHrOnly,
        minTss: filterBarProps.minTss,
        filterGearId: filterBarProps.filterGearId,
        activeSportTypes: filterBarProps.activeSportTypes,
        metricRangeActive: filterBarProps.metricRangeActive,
        singleDayFilterYmd: extras.singleDayFilterYmd ?? null,
        logDateRangeFilter: extras.logDateRangeFilter ?? null,
        isolateActivityId: extras.isolateActivityId ?? null,
    };
}
