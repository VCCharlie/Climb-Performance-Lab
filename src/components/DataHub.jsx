import React, { useState, useCallback } from 'react';
import { getCoreClimbDatabase } from '../services/climbDatabase';

import ActivityLogBulkBar from './data-hub/ActivityLogBulkBar';
import ActivityLogTab from './data-hub/ActivityLogTab';
import DataHubModals from './data-hub/DataHubModals';
import StravaEnrichOverlay from './data-hub/StravaEnrichOverlay';
import ImportSection from './data-hub/ImportSection';
import StravaProfileTab from './DataHub/StravaProfileTab';

import useActivityFilter from '../hooks/useActivityFilter';
import useActivityColumnVisibility from '../hooks/useActivityColumnVisibility';
import { useDataHubBulkActions } from '../hooks/useDataHubBulkActions';
import { useDataHubIntervalsSync } from '../hooks/useDataHubIntervalsSync';
import { useDataHubStravaEnrich } from '../hooks/useDataHubStravaEnrich';
import { useDataHubImport } from '../hooks/useDataHubImport';
import { useDataHubLogDerivations } from '../hooks/useDataHubLogDerivations';
import { useDataHubFilterBar } from '../hooks/useDataHubFilterBar';
import { useDataHubMaintenance } from '../hooks/useDataHubMaintenance';
import { useActivityCardLayout } from '../hooks/useMediaQuery';
import { useActivities } from '../hooks/useActivities';
import { useActivityLogNavigation } from '../context/ActivityLogNavigationContext';

const DataHub = ({
    intervalsConfig,
    stravaGetToken,
    startDate,
    endDate,
    stravaEnrichResults,
    onStravaEnrichResults,
    stravaAthleteId,
    stravaProfileData,
    onStravaProfileData,
    onOpenProfilerFromActivity,
    climbDatabaseForMatch = getCoreClimbDatabase(),
    initialInternalTab = 'log',
    profileFtp,
}) => {
    const {
        activities,
        importActivities: onImport,
        deleteActivity: onDelete,
        clearActivities: onClear,
        refreshFromServer: onRefresh,
    } = useActivities();

    const {
        activityFocusId: focusActivityId,
        logIsolateActivityId: isolateActivityId,
        logDateRangeFilter,
        activityLogRangesExpanded,
        setActivityLogRangesExpanded: onActivityLogRangesExpandedChange,
        clearActivityLogFilters,
        onFocusActivityCleared,
    } = useActivityLogNavigation();

    const [internalTab, setInternalTab] = useState(() => (
        ['log', 'strava-profile', 'import'].includes(initialInternalTab) ? initialInternalTab : 'log'
    ));
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

    const filter = useActivityFilter(activities, profileFtp);

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
        climbDatabaseForMatch,
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
        clearMetricFilters: filter.clearMetricFilters,
    });

    const bulk = useDataHubBulkActions({
        activities,
        onDelete,
        onImport,
        stravaGetToken,
        visibleActivityIdsFlat: logDerivations.visibleActivityIdsFlat,
        setIsDeleting,
    });

    const intervalsSync = useDataHubIntervalsSync({
        intervalsConfig,
        activities,
        onImport,
        stravaGetToken,
        bulkSelectedIds: bulk.bulkSelectedIds,
        selectedActivitiesForBulk: bulk.selectedActivitiesForBulk,
    });

    const stravaEnrich = useDataHubStravaEnrich({
        stravaGetToken,
        activities,
        startDate,
        endDate,
        onImport,
        onBeforeOpenPanel: () => setEditingActivity(null),
    });

    const dataImport = useDataHubImport({
        activities,
        onImport,
        onDelete,
        onImportComplete: () => setInternalTab('log'),
        profileFtp,
    });

    const maintenance = useDataHubMaintenance({
        activities,
        onImport,
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
        minTss: filter.minTss,
        setMinTss: filter.setMinTss,
        gearFilterOptions: logDerivations.gearFilterOptions,
        filterGearId: filter.filterGearId,
        setFilterGearId: filter.setFilterGearId,
        activityLogRangesExpanded,
        onActivityLogRangesExpandedChange,
        metricRangeActive: logDerivations.metricRangeActive,
        clearMetricFilters: filter.clearMetricFilters,
        applyMetricPreset: logDerivations.applyMetricPreset,
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
        setEditingActivity,
    });

    const onSaveEdit = useCallback(
        (updated) => maintenance.handleSaveEdit(updated, setEditingActivity),
        [maintenance],
    );

    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">
            <DataHubModals
                detailActivity={detailActivity}
                onCloseDetail={() => setDetailActivity(null)}
                stravaGetToken={stravaGetToken}
                profileFtp={profileFtp}
                editingActivity={editingActivity}
                onCloseEdit={() => setEditingActivity(null)}
                onSaveEdit={onSaveEdit}
                onFindOnStrava={stravaEnrich.handleFindOnStrava}
                activities={activities}
                bulk={bulk}
                dataImport={dataImport}
                maintenance={maintenance}
                isDeleting={isDeleting}
            />

            <div className="flex border-b border-cdborder" role="tablist" aria-label="Data Hub Tabs">
                <button type="button" id="tab-log" role="tab" aria-selected={internalTab === 'log'} aria-controls="tabpanel-log" onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {stravaGetToken && (
                    <button type="button" id="tab-strava-profile" role="tab" aria-selected={internalTab === 'strava-profile'} aria-controls="tabpanel-strava-profile" onClick={() => setInternalTab('strava-profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava-profile' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Profile
                    </button>
                )}
                <button type="button" id="tab-import" role="tab" aria-selected={internalTab === 'import'} aria-controls="tabpanel-import" onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <ActivityLogTab
                        intervalsSync={intervalsSync}
                        stravaListProgress={stravaEnrich.stravaListProgress}
                        bulk={bulk}
                        onOpenImportTab={() => setInternalTab('import')}
                        filterBarProps={filterBarProps}
                        isGroupedView={filter.isGroupedView}
                        isolateActivityId={isolateActivityId}
                        logDateRangeFilter={logDateRangeFilter}
                        expandAllGrouped={filter.expandAllGrouped}
                        collapseAllGrouped={filter.collapseAllGrouped}
                        groupedActivities={filter.groupedActivities}
                        isYearExpanded={filter.isYearExpanded}
                        toggleYear={filter.toggleYear}
                        clearActivityLogFilters={clearActivityLogFilters}
                        isolatedActivity={logDerivations.isolatedActivity}
                        rangeFilteredActivities={logDerivations.rangeFilteredActivities}
                        activities={activities}
                        processedActivities={filter.processedActivities}
                        logTableActivities={logDerivations.logTableActivities}
                        logTableGrouped={logDerivations.logTableGrouped}
                        sortConfig={filter.sortConfig}
                        requestSort={filter.requestSort}
                        handleDeleteSingle={maintenance.handleDeleteSingle}
                        setEditingActivity={setEditingActivity}
                        setDetailActivity={setDetailActivity}
                        isMonthExpanded={filter.isMonthExpanded}
                        toggleMonth={filter.toggleMonth}
                        onOpenProfilerFromActivity={onOpenProfilerFromActivity}
                        profilerClimbByActivityId={logDerivations.profilerClimbByActivityId}
                        profileFtp={profileFtp}
                        visibleColumns={visibleColumns}
                    />
                )}

                {internalTab === 'import' && (
                    <div role="tabpanel" id="tabpanel-import" aria-labelledby="tab-import" className="flex-1 overflow-hidden flex flex-col p-4">
                        <ImportSection
                            intervalsConfig={intervalsConfig}
                            stravaGetToken={stravaGetToken}
                            onDataDetected={dataImport.handleDataDetected}
                            onFetchedActivityFromUrl={dataImport.handleManualFetchedActivity}
                        />
                    </div>
                )}

                {internalTab === 'strava-profile' && (
                    <div role="tabpanel" id="tabpanel-strava-profile" aria-labelledby="tab-strava-profile" className="flex-1 overflow-hidden flex flex-col p-4">
                        <StravaProfileTab
                            getStravaToken={stravaGetToken}
                            athleteId={stravaAthleteId}
                            persistedData={stravaProfileData}
                            onDataChange={onStravaProfileData}
                            activities={activities}
                        />
                    </div>
                )}
            </div>

            <StravaEnrichOverlay
                open={stravaEnrich.showStravaEnrichPanel}
                stravaGetToken={stravaGetToken}
                onClose={stravaEnrich.closeStravaEnrichPanel}
                activities={activities}
                onImportNew={stravaEnrich.handleImportFromStrava}
                onAfterStravaLink={onImport}
                startDate={stravaEnrich.stravaSearchDates.startDate}
                endDate={stravaEnrich.stravaSearchDates.endDate}
                persistedResults={stravaEnrichResults}
                onResultsChange={onStravaEnrichResults}
                enrichmentTarget={stravaEnrich.enrichmentTarget}
            />

            {internalTab === 'log' && (
                <ActivityLogBulkBar
                    count={bulk.bulkSelectedIds.size}
                    onBulkEdit={() => {
                        setEditingActivity(null);
                        bulk.setShowBulkEditModal(true);
                    }}
                    onExport={bulk.exportBulkCsv}
                    onClearSelection={() => bulk.setBulkSelectedIds(new Set())}
                    onDelete={bulk.confirmBulkDeleteSelected}
                    isDeleting={isDeleting}
                    isBulkSaving={bulk.isBulkSaving}
                    stravaGetToken={stravaGetToken}
                    onStravaEnrich={() => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk)}
                    isStravaEnriching={bulk.isStravaEnriching}
                />
            )}
        </div>
    );
};

export default DataHub;
