import { ACTIVITY_SPORT_TYPE_FILTER_OPTIONS } from './activitySportTypeFilters';
import { GENERAL_METRIC_PRESETS, DRIFT_METRIC_PRESETS } from './metricRangePresets';

const SPORT_LABEL_BY_TYPE = Object.fromEntries(
    ACTIVITY_SPORT_TYPE_FILTER_OPTIONS.map(({ type, label }) => [type, label]),
);

const ALL_PRESETS = [...GENERAL_METRIC_PRESETS, ...DRIFT_METRIC_PRESETS];

/**
 * @typedef {{ id: string, label: string, group: 'quick' | 'type' | 'venue' | 'gear' | 'metric' | 'search', onRemove: () => void }} ActiveFilterPill
 */

/**
 * Build removable active-filter pills for the Activity Log.
 * @param {Record<string, unknown>} props — filter bar / panel props with change handlers
 * @returns {ActiveFilterPill[]}
 */
export function buildActivityLogActiveFilterPills(props = {}) {
    /** @type {ActiveFilterPill[]} */
    const pills = [];

    const search = String(props.search || '').trim();
    if (search) {
        pills.push({
            id: 'search',
            label: `Search: "${search}"`,
            group: 'search',
            onRemove: () => props.onSearchChange?.(''),
        });
    }

    if (props.indoorFilter === 'indoor') {
        pills.push({
            id: 'indoor',
            label: 'Indoor',
            group: 'venue',
            onRemove: () => props.onIndoorFilterChange?.('all'),
        });
    }
    if (props.indoorFilter === 'outdoor') {
        pills.push({
            id: 'outdoor',
            label: 'Outdoor',
            group: 'venue',
            onRemove: () => props.onIndoorFilterChange?.('all'),
        });
    }

    if (props.thisWeekOnly) {
        pills.push({
            id: 'thisWeek',
            label: 'This week',
            group: 'quick',
            onRemove: () => props.onThisWeekOnlyChange?.(false),
        });
    }
    if (props.rollingDays === 7) {
        pills.push({ id: 'r7', label: 'Last 7d', group: 'quick', onRemove: () => props.onRollingDaysChange?.(null) });
    }
    if (props.rollingDays === 14) {
        pills.push({ id: 'r14', label: 'Last 14d', group: 'quick', onRemove: () => props.onRollingDaysChange?.(null) });
    }
    if (props.rollingDays === 30) {
        pills.push({ id: 'r30', label: 'Last 30d', group: 'quick', onRemove: () => props.onRollingDaysChange?.(null) });
    }
    if (props.withPowerOnly) {
        pills.push({ id: 'withPower', label: 'With power', group: 'quick', onRemove: () => props.onWithPowerOnlyChange?.(false) });
    }
    if (props.noPowerOnly) {
        pills.push({ id: 'noPower', label: 'No power', group: 'quick', onRemove: () => props.onNoPowerOnlyChange?.(false) });
    }
    if (props.highLoadOnly) {
        pills.push({ id: 'highLoad', label: 'High load', group: 'quick', onRemove: () => props.onHighLoadOnlyChange?.(false) });
    }
    if (props.longRideOnly) {
        pills.push({ id: 'longRide', label: 'Long ride', group: 'quick', onRemove: () => props.onLongRideOnlyChange?.(false) });
    }
    if (props.missingHrOnly) {
        pills.push({ id: 'noHr', label: 'No HR', group: 'quick', onRemove: () => props.onMissingHrOnlyChange?.(false) });
    }
    if (props.hasTagOnly) {
        pills.push({ id: 'hasTag', label: 'Has tag', group: 'quick', onRemove: () => props.onHasTagOnlyChange?.(false) });
    }
    if (props.stravaLinkedOnly) {
        pills.push({ id: 'stravaLink', label: 'Strava link', group: 'quick', onRemove: () => props.onStravaLinkedOnlyChange?.(false) });
    }
    if (props.noStravaLinkOnly) {
        pills.push({ id: 'noStrava', label: 'No Strava link', group: 'quick', onRemove: () => props.onNoStravaLinkOnlyChange?.(false) });
    }
    if (props.possibleDuplicatesOnly) {
        pills.push({
            id: 'duplicates',
            label: 'Possible duplicates',
            group: 'quick',
            onRemove: () => props.onPossibleDuplicatesOnlyChange?.(false),
        });
    }

    for (const type of props.activeSportTypes || []) {
        pills.push({
            id: `type-${type}`,
            label: SPORT_LABEL_BY_TYPE[type] || type,
            group: 'type',
            onRemove: () => props.toggleSportType?.(type),
        });
    }

    if (props.filterGearId) {
        const gear = (props.gearFilterOptions || []).find((g) => g.id === props.filterGearId);
        pills.push({
            id: 'gear',
            label: gear ? `Bike: ${gear.label}` : 'Bike filter',
            group: 'gear',
            onRemove: () => props.onFilterGearIdChange?.(''),
        });
    }

    if (props.minTss !== '' && props.minTss != null) {
        pills.push({
            id: 'minTss',
            label: `TSS > ${props.minTss}`,
            group: 'metric',
            onRemove: () => props.onMinTssChange?.(''),
        });
    }

    for (const presetId of props.activeMetricPresetIds || []) {
        const preset = ALL_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            pills.push({
                id: `preset-${presetId}`,
                label: preset.label,
                group: 'metric',
                onRemove: () => props.toggleMetricPreset?.(presetId),
            });
        }
    }

    const manualMetricLabels = collectManualMetricRangeLabels(props);
    for (const item of manualMetricLabels) {
        pills.push({
            id: item.id,
            label: item.label,
            group: 'metric',
            onRemove: item.onRemove,
        });
    }

    return pills;
}

/**
 * @param {Record<string, unknown>} props
 */
function collectManualMetricRangeLabels(props) {
    /** @type {{ id: string, label: string, onRemove: () => void }[]} */
    const out = [];
    const addRange = (id, label, minKey, maxKey, minHandler, maxHandler) => {
        const min = props[minKey];
        const max = props[maxKey];
        if (min === '' && max === '') return;
        if (min === undefined && max === undefined) return;
        if ((min === '' || min == null) && (max === '' || max == null)) return;
        const text = min && max ? `${label} ${min}–${max}` : min ? `${label} ≥ ${min}` : `${label} ≤ ${max}`;
        out.push({
            id,
            label: text,
            onRemove: () => {
                minHandler?.('');
                maxHandler?.('');
            },
        });
    };

    addRange('dist', 'Dist', 'filterDistMin', 'filterDistMax', props.onFilterDistMinChange, props.onFilterDistMaxChange);
    addRange('speed', 'Speed', 'filterSpeedMin', 'filterSpeedMax', props.onFilterSpeedMinChange, props.onFilterSpeedMaxChange);
    addRange('power', 'Power', 'filterPowerMin', 'filterPowerMax', props.onFilterPowerMinChange, props.onFilterPowerMaxChange);
    addRange('dur', 'Duration', 'filterDurMinMin', 'filterDurMaxMin', props.onFilterDurMinMinChange, props.onFilterDurMaxMinChange);
    addRange('elev', 'Elev', 'filterElevMin', 'filterElevMax', props.onFilterElevMinChange, props.onFilterElevMaxChange);
    addRange('kj', 'kJ', 'filterKjMin', 'filterKjMax', props.onFilterKjMinChange, props.onFilterKjMaxChange);
    addRange('dec', 'Dec', 'filterDecMin', 'filterDecMax', props.onFilterDecMinChange, props.onFilterDecMaxChange);
    addRange('thr', 'Thr', 'filterThrMin', 'filterThrMax', props.onFilterThrMinChange, props.onFilterThrMaxChange);
    addRange('race', 'Race', 'filterRaceMin', 'filterRaceMax', props.onFilterRaceMinChange, props.onFilterRaceMaxChange);

    return out;
}
