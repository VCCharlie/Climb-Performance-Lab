import { useState, useRef, useEffect } from 'react';

/**
 * Activity Log filter bar props + util menu / manual refresh UI state.
 */
export function useDataHubFilterBar({
    search, setSearch,
    indoorFilter, setIndoorFilter,
    virtualRideChip, setVirtualRideChip,
    useCardLayout,
    visibleKeys, activePreset, applyPreset, toggleColumn, isColumnVisible,
    onRefresh,
    intervalsSync,
    bulk,
    dataImport,
    openNoPowerFilter,
    handleClearDatabase,
    activities,
    isDeleting,
    thisWeekOnly, setThisWeekOnly,
    rollingDays, setRollingDays,
    stravaGetToken,
    stravaLinkedOnly, setStravaLinkedOnly,
    noPowerOnly, setNoPowerOnly,
    withPowerOnly, setWithPowerOnly,
    highLoadOnly, setHighLoadOnly,
    longRideOnly, setLongRideOnly,
    missingHrOnly, setMissingHrOnly,
    minTss, setMinTss,
    gearFilterOptions,
    filterGearId, setFilterGearId,
    activityLogRangesExpanded,
    onActivityLogRangesExpandedChange,
    metricRangeActive,
    clearMetricFilters,
    applyMetricPreset,
    filterDistMin, setFilterDistMin,
    filterDistMax, setFilterDistMax,
    filterSpeedMin, setFilterSpeedMin,
    filterSpeedMax, setFilterSpeedMax,
    filterPowerMin, setFilterPowerMin,
    filterPowerMax, setFilterPowerMax,
    filterDurMinMin, setFilterDurMinMin,
    filterDurMaxMin, setFilterDurMaxMin,
    filterElevMin, setFilterElevMin,
    filterElevMax, setFilterElevMax,
    filterKjMin, setFilterKjMin,
    filterKjMax, setFilterKjMax,
    setEditingActivity,
    recoveryTss,
}) {
    const [showUtilMenu, setShowUtilMenu] = useState(false);
    const utilMenuRef = useRef(null);
    const utilMenuButtonRef = useRef(null);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const [logMobileFiltersOpen, setLogMobileFiltersOpen] = useState(false);

    useEffect(() => {
        if (!showUtilMenu) return undefined;
        const handler = (e) => {
            const target = e.target;
            if (utilMenuRef.current?.contains(target)) return;
            if (target.closest?.('[data-anchored-dropdown]')) return;
            setShowUtilMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showUtilMenu]);

    const filterBarProps = {
        search,
        onSearchChange: setSearch,
        indoorFilter,
        onIndoorFilterChange: setIndoorFilter,
        virtualRideChip,
        onVirtualRideChipChange: setVirtualRideChip,
        useCardLayout,
        logMobileFiltersOpen,
        onLogMobileFiltersOpenChange: setLogMobileFiltersOpen,
        showUtilMenu,
        onShowUtilMenuChange: setShowUtilMenu,
        utilMenuRef,
        utilMenuButtonRef,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
        onRefresh,
        isManualRefreshing,
        onManualRefresh: async () => {
            setIsManualRefreshing(true);
            try { await onRefresh(); } catch (e) { console.error(e); }
            finally { setIsManualRefreshing(false); }
        },
        onFindDuplicates: () => { dataImport.findDuplicates(); setShowUtilMenu(false); },
        onClearDatabase: () => { handleClearDatabase(); setShowUtilMenu(false); },
        bulkSelectedCount: bulk.bulkSelectedIds.size,
        activitiesCount: activities?.length ?? 0,
        isDeleting,
        thisWeekOnly,
        onThisWeekOnlyChange: setThisWeekOnly,
        rollingDays,
        onRollingDaysChange: setRollingDays,
        stravaGetToken,
        stravaLinkedOnly,
        onStravaLinkedOnlyChange: setStravaLinkedOnly,
        noPowerOnly,
        onNoPowerOnlyChange: setNoPowerOnly,
        withPowerOnly,
        onWithPowerOnlyChange: setWithPowerOnly,
        highLoadOnly,
        onHighLoadOnlyChange: setHighLoadOnly,
        longRideOnly,
        onLongRideOnlyChange: setLongRideOnly,
        missingHrOnly,
        onMissingHrOnlyChange: setMissingHrOnly,
        minTss,
        onMinTssChange: setMinTss,
        gearFilterOptions,
        filterGearId,
        onFilterGearIdChange: setFilterGearId,
        activityLogRangesExpanded,
        onActivityLogRangesExpandedChange,
        metricRangeActive,
        clearMetricFilters,
        applyMetricPreset,
        filterDistMin,
        onFilterDistMinChange: setFilterDistMin,
        filterDistMax,
        onFilterDistMaxChange: setFilterDistMax,
        filterSpeedMin,
        onFilterSpeedMinChange: setFilterSpeedMin,
        filterSpeedMax,
        onFilterSpeedMaxChange: setFilterSpeedMax,
        filterPowerMin,
        onFilterPowerMinChange: setFilterPowerMin,
        filterPowerMax,
        onFilterPowerMaxChange: setFilterPowerMax,
        filterDurMinMin,
        onFilterDurMinMinChange: setFilterDurMinMin,
        filterDurMaxMin,
        onFilterDurMaxMinChange: setFilterDurMaxMin,
        filterElevMin,
        onFilterElevMinChange: setFilterElevMin,
        filterElevMax,
        onFilterElevMaxChange: setFilterElevMax,
        filterKjMin,
        onFilterKjMinChange: setFilterKjMin,
        filterKjMax,
        onFilterKjMaxChange: setFilterKjMax,
        onBulkEdit: () => {
            setEditingActivity(null);
            bulk.setShowBulkEditModal(true);
        },
        onExportCsv: bulk.exportBulkCsv,
        onExportXlsx: bulk.exportBulkXlsx,
        isExportingXlsx: bulk.isExportingXlsx,
        onMarkRecovery: bulk.markBulkRecovery,
        recoveryTss,
        onStravaEnrich: () => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk),
        onStravaDescriptionBackfill: () => {
            const sel = bulk.selectedActivitiesForBulk;
            bulk.runStravaDescriptionBackfill(sel.length > 0 ? sel : null);
        },
        onMergePair: bulk.openMergeModal,
        onDeleteSelected: bulk.confirmBulkDeleteSelected,
        onClearSelection: () => bulk.setBulkSelectedIds(new Set()),
        isBulkSaving: bulk.isBulkSaving,
        isStravaEnriching: bulk.isStravaEnriching,
        isStravaDescBackfilling: bulk.isStravaDescBackfilling,
    };

    return { filterBarProps, showUtilMenu, setShowUtilMenu };
}
