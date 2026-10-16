import React from 'react';
import ActivityLogBulkBar from './ActivityLogBulkBar';
import ActivityLogTab from './ActivityLogTab';
import DataHubModals from './DataHubModals';
import StravaEnrichOverlay from './StravaEnrichOverlay';
import ImportSection from './ImportSection';
import SubTabNav from '../ui/SubTabNav';
import TabPageShell from '../shell/TabPageShell';

/**
 * Presentational DataHub shell — receives composed state from useDataHubController.
 */
const DataHubShell = ({
    internalTab,
    setInternalTab,
    onDataHubTabKeyDown,
    dataHubTabs,
    detailActivity,
    setDetailActivity,
    navigateDetailActivity,
    detailNavigationIds,
    editingActivity,
    setEditingActivity,
    isDeleting,
    onSaveEdit,
    resolvedProfileFtp,
    profileMaxHr,
    activities,
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
    onImport,
    userSettings,
}) => (
    <>
        <DataHubModals
            detailActivity={detailActivity}
            onCloseDetail={() => setDetailActivity(null)}
            detailNavigationIds={detailNavigationIds}
            onNavigateDetail={navigateDetailActivity}
            stravaGetToken={stravaGetToken}
            profileFtp={resolvedProfileFtp}
            profileMaxHr={profileMaxHr}
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

        <TabPageShell
            title="Activities"
            subtitle="Import, sync, and manage your training log"
            cardShellClassName="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in"
            contentClassName="flex-1 overflow-hidden flex flex-col"
            subNav={(
                <SubTabNav
                    tabs={dataHubTabs}
                    activeTab={internalTab}
                    onTabChange={setInternalTab}
                    onKeyDown={onDataHubTabKeyDown}
                    ariaLabel="Data Hub Tabs"
                    idPrefix="tab"
                    layout="scroll"
                />
            )}
        >
            {internalTab === 'log' && (
                <div role="tabpanel" id="tabpanel-log" aria-labelledby="tab-log" className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <ActivityLogTab
                        intervalsSync={intervalsSync}
                        isSignedIn={isSignedIn}
                        firestoreSyncStatus={firestoreSyncStatus}
                        isLoadingActivities={isLoadingActivities}
                        lastActivityDate={lastActivityDate}
                        lastCloudSyncAt={lastCloudSyncAt}
                        lastIntervalsSyncAt={intervalsSync.lastIntervalsSyncAt}
                        bulkSelectedCount={bulk.bulkSelectedIds.size}
                        stravaListProgress={stravaEnrich.stravaListProgress}
                        stravaAutoEnrichNotice={stravaEnrich.stravaAutoEnrichNotice}
                        onDismissStravaAutoEnrichNotice={stravaEnrich.dismissStravaAutoEnrichNotice}
                        stravaEnrichPendingCount={stravaEnrich.stravaEnrichPending?.length ?? 0}
                        onOpenStravaPendingQueue={stravaGetToken ? stravaEnrich.openStravaEnrichPendingPanel : undefined}
                        bulk={bulk}
                        onOpenImportTab={openImportTab}
                        filterBarProps={filterBarProps}
                        isGroupedView={filter.isGroupedView}
                        isolateActivityId={isolateActivityId}
                        logDateRangeFilter={logDateRangeFilter}
                        expandAllGrouped={filter.expandAllGrouped}
                        collapseAllGrouped={filter.collapseAllGrouped}
                        groupedActivities={filter.groupedActivities}
                        isYearExpanded={filter.isYearExpanded}
                        toggleYear={filter.toggleYear}
                        ensureYearExpanded={filter.ensureYearExpanded}
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
                        ensureMonthExpanded={filter.ensureMonthExpanded}
                        onOpenProfilerFromActivity={onOpenProfilerFromActivity}
                        profilerClimbByActivityId={logDerivations.profilerClimbByActivityId}
                        profileFtp={resolvedProfileFtp}
                        profileMaxHr={profileMaxHr}
                        getStravaToken={stravaGetToken}
                        visibleColumns={visibleColumns}
                        onFilterByGearId={filter.filterByGearId}
                        onFilterByDay={filter.filterByDay}
                        singleDayFilterYmd={filter.singleDayFilterYmd}
                        clearDayFilter={filter.clearDayFilter}
                        onRunSync={handleRunSyncWithBulk}
                    />
                </div>
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
                userSettings={userSettings}
                stravaEnrichPending={stravaEnrich.stravaEnrichPending}
                onRetryPendingEnrich={stravaEnrich.retryStravaEnrichPending}
                onDismissPendingEntry={stravaEnrich.dismissPendingEnrichEntry}
                onClearPendingEnrich={stravaEnrich.clearStravaEnrichPending}
                pendingRetryMessage={stravaEnrich.pendingRetryMessage}
                isRetryingPendingEnrich={stravaEnrich.isRetryingPendingEnrich}
            />

            {internalTab === 'log' && (
                <ActivityLogBulkBar
                    useCardLayout={useCardLayout}
                    count={bulk.bulkSelectedIds.size}
                    onBulkEdit={() => {
                        setEditingActivity(null);
                        bulk.setShowBulkEditModal(true);
                    }}
                    onExportCsv={bulk.exportBulkCsv}
                    onExportXlsx={bulk.exportBulkXlsx}
                    isExportingXlsx={bulk.isExportingXlsx}
                    onClearSelection={() => bulk.setBulkSelectedIds(new Set())}
                    onDelete={bulk.confirmBulkDeleteSelected}
                    isDeleting={isDeleting}
                    isBulkSaving={bulk.isBulkSaving}
                    stravaGetToken={stravaGetToken}
                    onStravaEnrich={() => bulk.runStravaEnrichSelected(bulk.selectedActivitiesForBulk)}
                    isStravaEnriching={bulk.isStravaEnriching}
                    onStravaDescriptionBackfill={() => {
                        const sel = bulk.selectedActivitiesForBulk;
                        bulk.runStravaDescriptionBackfill(sel.length > 0 ? sel : null);
                    }}
                    onDecouplingBackfill={() => {
                        const sel = bulk.selectedActivitiesForBulk;
                        bulk.runDecouplingBackfill(sel.length > 0 ? sel : null);
                    }}
                    canDecouplingBackfill={Boolean(intervalsConfig?.apiKey || stravaGetToken)
                        && Number(resolvedProfileFtp) > 0}
                    isStravaDescBackfilling={bulk.isStravaDescBackfilling}
                    isDecouplingBackfilling={bulk.isDecouplingBackfilling}
                    intervalsConfig={intervalsConfig}
                    onIntervalsMapBackfill={() => {
                        bulk.runIntervalsMapBackfillSelected(bulk.selectedActivitiesForBulk);
                    }}
                    isIntervalsMapBackfilling={bulk.isIntervalsMapBackfilling}
                />
            )}
        </TabPageShell>
    </>
);

export default DataHubShell;
