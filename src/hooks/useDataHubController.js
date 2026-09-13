import { useState, useCallback, useMemo, useEffect } from 'react';
import { getCoreClimbDatabase } from '../services/climbDatabase';
import useActivityFilter from './useActivityFilter';
import useActivityColumnVisibility from './useActivityColumnVisibility';
import { useDataHubBulkActions } from './useDataHubBulkActions';
import { useDataHubStravaEnrich } from './useDataHubStravaEnrich';
import { useDataHubImport } from './useDataHubImport';
import { useIntervalsSync } from '../context/IntervalsSyncContext';
import { useDataHubLogDerivations } from './useDataHubLogDerivations';
import { useDataHubFilterBar } from './useDataHubFilterBar';
import { useDataHubMaintenance } from './useDataHubMaintenance';
import { useActivityCardLayout } from './useMediaQuery';
import { useActivities, useActivitiesSync } from './useActivities';
import { useProfileFtp } from '../context/ProfileFtpContext';
import { useActivityLogNavigation } from '../context/ActivityLogNavigationContext';
import { resolveRecoveryTss } from '../utils/recoveryTss';
import { readLastCloudSyncAt } from '../utils/activityLogSyncLabel';
import { filterActivitiesByDashboardTimeRange } from '../utils/dashboardActivityWindow';
import { useTabListKeyboard } from './useTabListKeyboard';
import { useDuplicatePrompt } from '../context/DuplicatePromptContext';

export const DATA_HUB_INTERNAL_TABS = ['log', 'import'];

/**
 * Fail-safe: only allow known internal tab ids.
 * @param {string} tab
 * @returns {'log' | 'import'}
 */
export function resolveDataHubInternalTab(tab) {
    return DATA_HUB_INTERNAL_TABS.includes(tab) ? tab : 'log';
}

/**
 * Composes DataHub hooks — keeps DataHub.jsx as a thin shell (Bolt 3.7).
 * @param {object} props DataHub component props
 */
export function useDataHubController({
    intervalsConfig,
    stravaGetToken,
    stravaConfig,
    timeRange = '1Y',
    customStart = '',
    customEnd = '',
    startDate,
    endDate,
    stravaEnrichResults,
    onStravaEnrichResults,
    onOpenProfilerFromActivity,
    climbDatabaseForMatch = getCoreClimbDatabase(),
    initialInternalTab = 'log',
    profileFtp: profileFtpProp,
    profileMaxHr,
    userSettings,
    isSignedIn = false,
}) {
    const resolvedProfileFtp = useProfileFtp().ftp || profileFtpProp || 0;
    const safeClimbDatabase = Array.isArray(climbDatabaseForMatch) && climbDatabaseForMatch.length
        ? climbDatabaseForMatch
        : getCoreClimbDatabase();

    const {
        activities,
        importActivities: onImport,
        upsertActivities: onUpsert,
        deleteActivity: onDelete,
        clearActivities: onClear,
        refreshFromServer: onRefresh,
    } = useActivities();

    const {
        syncStatus: firestoreSyncStatus,
        isLoading: isLoadingActivities,
        lastActivityDate,
    } = useActivitiesSync();

    const lastCloudSyncAt = useMemo(
        () => readLastCloudSyncAt(),
        [firestoreSyncStatus, activities.length],
    );

    const {
        activityFocusId: focusActivityId,
        logIsolateActivityId: isolateActivityId,
        logDateRangeFilter,
        activityLogRangesExpanded,
        setActivityLogRangesExpanded: onActivityLogRangesExpandedChange,
        clearActivityLogFilters,
        onFocusActivityCleared,
    } = useActivityLogNavigation();

    const [internalTab, setInternalTab] = useState(() => resolveDataHubInternalTab(initialInternalTab));

    const onDataHubTabKeyDown = useTabListKeyboard(DATA_HUB_INTERNAL_TABS, internalTab, setInternalTab);
    const [detailActivity, setDetailActivity] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);

    const {
        visibleColumns,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
    } = useActivityColumnVisibility();

    const useCardLayout = useActivityCardLayout();

    const activitiesInGlobalTimeRange = useMemo(
        () => filterActivitiesByDashboardTimeRange(activities, timeRange, customStart, customEnd),
        [activities, timeRange, customStart, customEnd],
    );

    const filter = useActivityFilter(activitiesInGlobalTimeRange, resolvedProfileFtp);

    const logDerivations = useDataHubLogDerivations({
        activities,
        focusActivityId,
        onFocusActivityCleared,
        isolateActivityId,
        logDateRangeFilter,
        setInternalTab,
        isGroupedView: filter.isGroupedView,
        openGroupedPathForActivity: filter.openGroupedPathForActivity,
        processedActivities: filter.processedActivities,
        groupedActivities: filter.groupedActivities,
        sortConfig: filter.sortConfig,
        isYearExpanded: filter.isYearExpanded,
        isMonthExpanded: filter.isMonthExpanded,
        climbDatabaseForMatch: safeClimbDatabase,
        filterDistMin: filter.filterDistMin,
        filterDistMax: filter.filterDistMax,
        filterSpeedMin: filter.filterSpeedMin,
        filterSpeedMax: filter.filterSpeedMax,
        filterPowerMin: filter.filterPowerMin,
        filterPowerMax: filter.filterPowerMax,
        filterDurMinMin: filter.filterDurMinMin,
        filterDurMaxMin: filter.filterDurMaxMin,
        filterElevMin: filter.filterElevMin,
        filterElevMax: filter.filterElevMax,
        filterKjMin: filter.filterKjMin,
        filterKjMax: filter.filterKjMax,
        filterDecMin: filter.filterDecMin,
        filterDecMax: filter.filterDecMax,
        filterThrMin: filter.filterThrMin,
        filterThrMax: filter.filterThrMax,
        filterRaceMin: filter.filterRaceMin,
        filterRaceMax: filter.filterRaceMax,
        clearMetricFilters: filter.clearMetricFilters,
        climbMatchEnabled: internalTab === 'log',
    });

    const bulk = useDataHubBulkActions({
        activities,
        onDelete,
        onImport,
        onUpsert,
        stravaGetToken,
        stravaConfig,
        intervalsConfig,
        visibleActivityIdsFlat: logDerivations.visibleActivityIdsFlat,
        setIsDeleting,
        recoveryTss: resolveRecoveryTss(userSettings),
        userSettings,
    });

    const intervalsSync = useIntervalsSync();

    const handleRunSyncWithBulk = useCallback(() => {
        try {
            return intervalsSync.handleRunSync(bulk.bulkSelectedIds, bulk.selectedActivitiesForBulk);
        } catch {
            return Promise.resolve();
        }
    }, [intervalsSync, bulk.bulkSelectedIds, bulk.selectedActivitiesForBulk]);

    const stravaEnrich = useDataHubStravaEnrich({
        stravaGetToken,
        activities,
        startDate,
        endDate,
        onImport,
        onBeforeOpenPanel: () => setEditingActivity(null),
        userSettings,
    });

    const dataImport = useDataHubImport({
        activities,
        onImport,
        onDelete,
        onImportComplete: () => setInternalTab('log'),
        profileFtp: resolvedProfileFtp,
    });

    const { registerOpenDuplicateResolver } = useDuplicatePrompt();
    useEffect(() => {
        return registerOpenDuplicateResolver(dataImport.openDuplicateResolver);
    }, [registerOpenDuplicateResolver, dataImport.openDuplicateResolver]);

    const maintenance = useDataHubMaintenance({
        activities,
        onUpsert,
        onClear,
        stravaGetToken,
        setIsDeleting,
    });

    const { filterBarProps } = useDataHubFilterBar({
        search: filter.search,
        setSearch: filter.setSearch,
        indoorFilter: filter.indoorFilter,
        setIndoorFilter: filter.setIndoorFilter,
        virtualRideChip: filter.virtualRideChip,
        setVirtualRideChip: filter.setVirtualRideChip,
        gravelRideChip: filter.gravelRideChip,
        setGravelRideChip: filter.setGravelRideChip,
        mtbRideChip: filter.mtbRideChip,
        setMtbRideChip: filter.setMtbRideChip,
        ebikeRideChip: filter.ebikeRideChip,
        setEbikeRideChip: filter.setEbikeRideChip,
        useCardLayout,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
        onRefresh,
        intervalsSync,
        bulk,
        dataImport,
        openNoPowerFilter: maintenance.openNoPowerFilter,
        handleClearDatabase: maintenance.handleClearDatabase,
        activities,
        isDeleting,
        thisWeekOnly: filter.thisWeekOnly,
        setThisWeekOnly: filter.setThisWeekOnly,
        rollingDays: filter.rollingDays,
        setRollingDays: filter.setRollingDays,
        stravaGetToken,
        stravaLinkedOnly: filter.stravaLinkedOnly,
        setStravaLinkedOnly: filter.setStravaLinkedOnly,
        noStravaLinkOnly: filter.noStravaLinkOnly,
        setNoStravaLinkOnly: filter.setNoStravaLinkOnly,
        possibleDuplicatesOnly: filter.possibleDuplicatesOnly,
        setPossibleDuplicatesOnly: filter.setPossibleDuplicatesOnly,
        noPowerOnly: filter.noPowerOnly,
        setNoPowerOnly: filter.setNoPowerOnly,
        withPowerOnly: filter.withPowerOnly,
        setWithPowerOnly: filter.setWithPowerOnly,
        highLoadOnly: filter.highLoadOnly,
        setHighLoadOnly: filter.setHighLoadOnly,
        longRideOnly: filter.longRideOnly,
        setLongRideOnly: filter.setLongRideOnly,
        missingHrOnly: filter.missingHrOnly,
        setMissingHrOnly: filter.setMissingHrOnly,
        hasTagOnly: filter.hasTagOnly,
        setHasTagOnly: filter.setHasTagOnly,
        minTss: filter.minTss,
        setMinTss: filter.setMinTss,
        gearFilterOptions: filter.gearFilterOptions,
        filterGearId: filter.filterGearId,
        setFilterGearId: filter.setFilterGearId,
        activityLogRangesExpanded,
        onActivityLogRangesExpandedChange,
        metricRangeActive: logDerivations.metricRangeActive,
        clearMetricFilters: filter.clearMetricFilters,
        activeMetricPresetIds: filter.activeMetricPresetIds,
        toggleMetricPreset: filter.toggleMetricPreset,
        clearActiveMetricPresets: filter.clearActiveMetricPresets,
        filterDistMin: filter.filterDistMin,
        setFilterDistMin: filter.setFilterDistMin,
        filterDistMax: filter.filterDistMax,
        setFilterDistMax: filter.setFilterDistMax,
        filterSpeedMin: filter.filterSpeedMin,
        setFilterSpeedMin: filter.setFilterSpeedMin,
        filterSpeedMax: filter.filterSpeedMax,
        setFilterSpeedMax: filter.setFilterSpeedMax,
        filterPowerMin: filter.filterPowerMin,
        setFilterPowerMin: filter.setFilterPowerMin,
        filterPowerMax: filter.filterPowerMax,
        setFilterPowerMax: filter.setFilterPowerMax,
        filterDurMinMin: filter.filterDurMinMin,
        setFilterDurMinMin: filter.setFilterDurMinMin,
        filterDurMaxMin: filter.filterDurMaxMin,
        setFilterDurMaxMin: filter.setFilterDurMaxMin,
        filterElevMin: filter.filterElevMin,
        setFilterElevMin: filter.setFilterElevMin,
        filterElevMax: filter.filterElevMax,
        setFilterElevMax: filter.setFilterElevMax,
        filterKjMin: filter.filterKjMin,
        setFilterKjMin: filter.setFilterKjMin,
        filterKjMax: filter.filterKjMax,
        setFilterKjMax: filter.setFilterKjMax,
        filterDecMin: filter.filterDecMin,
        setFilterDecMin: filter.setFilterDecMin,
        filterDecMax: filter.filterDecMax,
        setFilterDecMax: filter.setFilterDecMax,
        filterThrMin: filter.filterThrMin,
        setFilterThrMin: filter.setFilterThrMin,
        filterThrMax: filter.filterThrMax,
        setFilterThrMax: filter.setFilterThrMax,
        filterRaceMin: filter.filterRaceMin,
        setFilterRaceMin: filter.setFilterRaceMin,
        filterRaceMax: filter.filterRaceMax,
        setFilterRaceMax: filter.setFilterRaceMax,
        setEditingActivity,
        recoveryTss: resolveRecoveryTss(userSettings),
        logFilterPresets: filter.logFilterPresets,
        activeLogFilterPresetId: filter.activeLogFilterPresetId,
        detectedLogFilterPresetId: filter.detectedLogFilterPresetId,
        applyLogFilterPreset: filter.applyLogFilterPreset,
        resetLogFilters: filter.resetLogFilters,
        intervalsConfig,
        userSettings,
    });

    const onSaveEdit = useCallback(
        (updated) => maintenance.handleSaveEdit(updated, setEditingActivity),
        [maintenance],
    );

    const dataHubTabs = useMemo(() => [
        { id: 'log', label: 'Activity Log', ariaControls: 'tabpanel-log' },
        { id: 'import', label: 'Import Data', ariaControls: 'tabpanel-import' },
    ], []);

    const openImportTab = useCallback(() => setInternalTab('import'), []);

    return {
        internalTab,
        setInternalTab,
        onDataHubTabKeyDown,
        dataHubTabs,
        detailActivity,
        setDetailActivity,
        editingActivity,
        setEditingActivity,
        isDeleting,
        onSaveEdit,
        resolvedProfileFtp,
        profileMaxHr,
        activities,
        onImport,
        intervalsConfig,
        stravaGetToken,
        isSignedIn,
        firestoreSyncStatus,
        isLoadingActivities,
        lastActivityDate,
        lastCloudSyncAt,
        intervalsSync,
        bulk,
        stravaEnrich,
        dataImport,
        maintenance,
        filterBarProps,
        filter,
        logDerivations,
        isolateActivityId,
        logDateRangeFilter,
        clearActivityLogFilters,
        onOpenProfilerFromActivity,
        visibleColumns,
        useCardLayout,
        handleRunSyncWithBulk,
        openImportTab,
        stravaEnrichResults,
        onStravaEnrichResults,
        userSettings,
    };
}
