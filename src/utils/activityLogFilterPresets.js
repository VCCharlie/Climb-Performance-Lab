/**
 * Built-in Activity Log filter bundles (chips + venue; metrics/gear/search stay unless cleared).
 */
export const ACTIVITY_LOG_FILTER_PRESET_STORAGE_KEY = 'cpl-activity-log-filter-preset';

export const BUILTIN_ACTIVITY_LOG_FILTER_PRESETS = [
    { id: 'all', label: 'All activities' },
    { id: 'outdoor', label: 'Outdoor rides' },
    { id: 'virtual', label: 'Virtual only' },
    { id: 'gravel', label: 'Gravel rides' },
    { id: 'mtb', label: 'MTB rides' },
    { id: 'ebike', label: 'E-bike rides' },
    { id: 'this_week', label: 'This week' },
    { id: 'with_power', label: 'With power data' },
    { id: 'no_strava_link', label: 'No Strava link' },
    { id: 'possible_duplicates', label: 'Possible duplicates' },
];

/** Default chip / venue state when no preset is active. */
export function defaultLogFilterChipState() {
    return {
        indoorFilter: 'all',
        virtualRideChip: false,
        gravelRideChip: false,
        mtbRideChip: false,
        ebikeRideChip: false,
        thisWeekOnly: false,
        rollingDays: null,
        stravaLinkedOnly: false,
        noStravaLinkOnly: false,
        possibleDuplicatesOnly: false,
        noPowerOnly: false,
        withPowerOnly: false,
        highLoadOnly: false,
        longRideOnly: false,
        missingHrOnly: false,
        minTss: '',
    };
}

/**
 * Map preset id → partial chip state (merged onto defaults).
 * @param {string} presetId
 */
export function chipStateForPreset(presetId) {
    const base = defaultLogFilterChipState();
    switch (presetId) {
        case 'outdoor':
            return { ...base, indoorFilter: 'outdoor' };
        case 'virtual':
            return { ...base, indoorFilter: 'indoor', virtualRideChip: true };
        case 'gravel':
            return { ...base, gravelRideChip: true };
        case 'mtb':
            return { ...base, mtbRideChip: true };
        case 'ebike':
            return { ...base, ebikeRideChip: true };
        case 'this_week':
            return { ...base, thisWeekOnly: true };
        case 'with_power':
            return { ...base, withPowerOnly: true };
        case 'no_strava_link':
            return { ...base, noStravaLinkOnly: true };
        case 'possible_duplicates':
            return { ...base, possibleDuplicatesOnly: true };
        case 'all':
        default:
            return base;
    }
}

/**
 * @returns {string | null}
 */
export function parseStoredFilterPresetId() {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVITY_LOG_FILTER_PRESET_STORAGE_KEY);
    if (!raw || typeof raw !== 'string') return null;
    const id = raw.trim();
    if (!BUILTIN_ACTIVITY_LOG_FILTER_PRESETS.some((p) => p.id === id)) return null;
    return id;
}

/**
 * Detect active built-in preset from current chip state (best match).
 * @param {object} state
 */
export function detectActiveLogFilterPreset(state) {
    const snap = {
        indoorFilter: state.indoorFilter ?? 'all',
        virtualRideChip: Boolean(state.virtualRideChip),
        gravelRideChip: Boolean(state.gravelRideChip),
        mtbRideChip: Boolean(state.mtbRideChip),
        ebikeRideChip: Boolean(state.ebikeRideChip),
        thisWeekOnly: Boolean(state.thisWeekOnly),
        rollingDays: state.rollingDays ?? null,
        stravaLinkedOnly: Boolean(state.stravaLinkedOnly),
        noStravaLinkOnly: Boolean(state.noStravaLinkOnly),
        possibleDuplicatesOnly: Boolean(state.possibleDuplicatesOnly),
        noPowerOnly: Boolean(state.noPowerOnly),
        withPowerOnly: Boolean(state.withPowerOnly),
        highLoadOnly: Boolean(state.highLoadOnly),
        longRideOnly: Boolean(state.longRideOnly),
        missingHrOnly: Boolean(state.missingHrOnly),
        minTss: state.minTss ?? '',
    };

    for (const preset of BUILTIN_ACTIVITY_LOG_FILTER_PRESETS) {
        const expected = chipStateForPreset(preset.id);
        const keys = Object.keys(expected);
        let match = true;
        for (const k of keys) {
            if (snap[k] !== expected[k]) {
                match = false;
                break;
            }
        }
        if (match) return preset.id;
    }
    return null;
}
