import { normalizeDate } from './formatters';
import { buildActivityLogFilterSnapshot } from './activityLogFilterPersistence';

/**
 * Calendar date (YYYY-MM-DD) from an activity date field (ISO date or datetime).
 * @param {string | Date | number | null | undefined} dateValue
 * @returns {string | null}
 */
export function activityCalendarYmd(dateValue) {
    const normalized = normalizeDate(dateValue);
    if (!normalized || normalized.length < 10) return null;
    return normalized.slice(0, 10);
}

/**
 * @param {{ date?: string | null }} activity
 * @param {string | null | undefined} targetYmd
 * @returns {boolean}
 */
export function activityMatchesDayFilter(activity, targetYmd) {
    if (!targetYmd) return true;
    if (!activity) return false;
    return activityCalendarYmd(activity.date) === targetYmd;
}

/**
 * Snapshot of filter hook state before applying a single-day filter (for one-level undo).
 * @param {Record<string, unknown>} filterState
 * @returns {Record<string, unknown>}
 */
export function captureFilterStateForDayUndo(filterState) {
    return {
        ...buildActivityLogFilterSnapshot(filterState),
        sortConfig: filterState.sortConfig
            ? { key: filterState.sortConfig.key, direction: filterState.sortConfig.direction }
            : { key: 'date', direction: 'desc' },
        activeLogFilterPresetId: filterState.activeLogFilterPresetId ?? 'all',
    };
}

/**
 * Apply a captured snapshot onto a bag of React setters (used by useActivityFilter restore).
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @param {Record<string, Function>} setters
 */
export function applyFilterSnapshotToSetters(snapshot, setters) {
    if (!snapshot || !setters) return;

    const apply = (setterKey, snapshotKey, fallback) => {
        const fn = setters[setterKey];
        if (typeof fn !== 'function') return;
        const key = snapshotKey ?? setterKey.replace(/^set/, '').replace(/^./, (c) => c.toLowerCase());
        if (snapshot[key] !== undefined) {
            fn(snapshot[key]);
        } else if (fallback !== undefined) {
            fn(fallback);
        }
    };

    apply('setSearch', 'search', '');
    apply('setIndoorFilter', 'indoorFilter', 'all');
    apply('setThisWeekOnly', 'thisWeekOnly', false);
    apply('setRollingDays', 'rollingDays', null);
    apply('setStravaLinkedOnly', 'stravaLinkedOnly', false);
    apply('setNoStravaLinkOnly', 'noStravaLinkOnly', false);
    apply('setPossibleDuplicatesOnly', 'possibleDuplicatesOnly', false);
    apply('setNoPowerOnly', 'noPowerOnly', false);
    apply('setWithPowerOnly', 'withPowerOnly', false);
    apply('setHighLoadOnly', 'highLoadOnly', false);
    apply('setLongRideOnly', 'longRideOnly', false);
    apply('setMissingHrOnly', 'missingHrOnly', false);
    apply('setActiveSportTypes', 'activeSportTypes', []);
    apply('setHasTagOnly', 'hasTagOnly', false);
    apply('setMinTss', 'minTss', '');
    apply('setFilterGearId', 'filterGearId', '');
    apply('setActiveMetricPresetIds', 'activeMetricPresetIds', []);
    apply('setActiveLogFilterPresetId', 'activeLogFilterPresetId', 'all');

    if (typeof setters.applyMetricFilterState === 'function') {
        setters.applyMetricFilterState(snapshot);
    }

    if (typeof setters.setSortConfig === 'function' && snapshot.sortConfig) {
        setters.setSortConfig(snapshot.sortConfig);
    }
}
