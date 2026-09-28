import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import ActivityLogView from './ActivityLogView';
import ActivityLogFilterBar from './ActivityLogFilterBar';
import FilterAnalyticsBar from './activity-log-filters/FilterAnalyticsBar';
import ActivityLogSyncBanners from './ActivityLogSyncBanners';
import ActivityLogSyncStatusLine from './ActivityLogSyncStatusLine';
import IntervalsSyncPanel from './IntervalsSyncPanel';
import QuickNav from './QuickNav';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { useTodayIntervalsSync } from '../../context/IntervalsSyncContext';
import { useActivityLogFilterAnalytics } from '../../hooks/useActivityLogFilterAnalytics';

/**
 * Activity Log tab: sync banners, filters, grouped nav, and table/cards (Bolt fase 3e).
 */
export default function ActivityLogTab({
    intervalsSync,
    isSignedIn = false,
    firestoreSyncStatus,
    isLoadingActivities,
    lastActivityDate,
    lastCloudSyncAt,
    lastIntervalsSyncAt,
    bulkSelectedCount = 0,
    stravaListProgress,
    stravaAutoEnrichNotice,
    onDismissStravaAutoEnrichNotice,
    bulk,
    onOpenImportTab,
    filterBarProps,
    isGroupedView,
    isolateActivityId,
    logDateRangeFilter,
    expandAllGrouped,
    collapseAllGrouped,
    groupedActivities,
    isYearExpanded,
    toggleYear,
    ensureYearExpanded,
    clearActivityLogFilters,
    isolatedActivity,
    rangeFilteredActivities,
    activities,
    processedActivities,
    logTableActivities,
    logTableGrouped,
    sortConfig,
    requestSort,
    handleDeleteSingle,
    setEditingActivity,
    setDetailActivity,
    isMonthExpanded,
    toggleMonth,
    ensureMonthExpanded,
    onOpenProfilerFromActivity,
    profilerClimbByActivityId,
    profileFtp,
    profileMaxHr,
    getStravaToken,
    visibleColumns,
    onFilterByGearId,
    onFilterByDay,
    singleDayFilterYmd,
    clearDayFilter,
    onRunSync,
}) {
    const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();
    const { isActive: filterAnalyticsActive, filterLabels, filterState, analytics } = useActivityLogFilterAnalytics({
        filterBarProps,
        singleDayFilterYmd,
        logDateRangeFilter,
        isolateActivityId,
        filteredActivities: processedActivities,
        allActivities: activities,
        profileFtp,
    });

    return (
        <div role="tabpanel" id="tabpanel-log" aria-labelledby="tab-log" className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
            <ActivityLogSyncBanners
                syncStatus={intervalsSync.syncStatus}
                syncErrorDetail={intervalsSync.syncErrorDetail}
                isSyncing={intervalsSync.isSyncing}
                syncProgress={intervalsSync.syncProgress}
                stravaListProgress={stravaListProgress}
                isStravaEnriching={bulk.isStravaEnriching}
                stravaEnrichMsg={bulk.stravaEnrichMsg}
                onDismissStravaEnrichMsg={() => bulk.setStravaEnrichMsg(null)}
                isStravaDescBackfilling={bulk.isStravaDescBackfilling}
                stravaDescBackfillMsg={bulk.stravaDescBackfillMsg}
                onDismissStravaDescBackfillMsg={() => bulk.setStravaDescBackfillMsg(null)}
                isDecouplingBackfilling={bulk.isDecouplingBackfilling}
                decouplingBackfillMsg={bulk.decouplingBackfillMsg}
                onDismissDecouplingBackfillMsg={() => bulk.setDecouplingBackfillMsg(null)}
                stravaAutoEnrichNotice={stravaAutoEnrichNotice}
                onDismissStravaAutoEnrichNotice={onDismissStravaAutoEnrichNotice}
            />

            <ActivityLogSyncStatusLine
                isSignedIn={isSignedIn}
                firestoreSyncStatus={firestoreSyncStatus}
                isLoadingActivities={isLoadingActivities}
                activityCount={activities?.length ?? 0}
                lastActivityDate={lastActivityDate}
                lastCloudSyncAt={lastCloudSyncAt}
                lastIntervalsSyncAt={lastIntervalsSyncAt}
                isIntervalsBusy={intervalsSync.isFetchingNewIntervals || intervalsSync.isSyncing}
                onSyncToday={syncTodayActivities}
                isTodaySyncBusy={isTodaySyncBusy}
            />

            <IntervalsSyncPanel
                syncDates={intervalsSync.syncDates}
                onSyncDatesChange={intervalsSync.setSyncDates}
                sportFilters={intervalsSync.sportFilters}
                onToggleSportFilter={intervalsSync.toggleSportFilter}
                onSetAllSportFilters={intervalsSync.setAllSportFilters}
                syncMode={intervalsSync.syncMode}
                onSyncModeChange={intervalsSync.setSyncMode}
                selectedCount={bulkSelectedCount}
                onRunSync={onRunSync ?? intervalsSync.handleRunSync}
                isBusy={intervalsSync.isFetchingNewIntervals || intervalsSync.isSyncing}
                syncProgress={intervalsSync.syncProgress}
                stravaConnected={filterBarProps.stravaGetToken != null}
                stravaEnrichEnabled={intervalsSync.stravaEnrichEnabled}
                onStravaEnrichEnabledChange={intervalsSync.setStravaEnrichEnabled}
                syncDepth={intervalsSync.syncDepth}
                onSyncDepthChange={intervalsSync.setSyncDepth}
                onOpenImportTab={onOpenImportTab}
                lastIntervalsSyncAt={lastIntervalsSyncAt}
                lastSyncHealthSummary={intervalsSync.lastSyncHealthSummary}
            />

            <ActivityLogFilterBar {...filterBarProps} />

            {filterAnalyticsActive && analytics && (
                <FilterAnalyticsBar
                    filterLabels={filterLabels}
                    filterState={filterState}
                    analytics={analytics}
                    onResetFilters={filterBarProps.onResetLogFilters}
                    className="mb-2 shrink-0"
                />
            )}

            {isGroupedView && !isolateActivityId && !(logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd) && !singleDayFilterYmd && (
                <div className="flex flex-col gap-2 shrink-0 mb-2 lg:mb-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={expandAllGrouped}
                            className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/50 cd-focus-ring"
                        >
                            Expand all
                        </button>
                        <button
                            type="button"
                            onClick={collapseAllGrouped}
                            className="text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdtext cd-focus-ring"
                        >
                            Collapse all
                        </button>
                        <span className="text-[9px] text-cdmuted hidden sm:inline">
                            Bulk select only includes visible rows — expand groups or use Expand all first.
                        </span>
                    </div>
                    <div className="hidden lg:block">
                        <QuickNav
                            groupedActivities={groupedActivities}
                            isYearExpanded={isYearExpanded}
                            onToggleYear={toggleYear}
                            ensureYearExpanded={ensureYearExpanded}
                            ensureMonthExpanded={ensureMonthExpanded}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col gap-2">
                {isolateActivityId && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cdaccent/40 bg-cdaccent/10 px-3 py-2 text-sm text-cdtext">
                        <span>
                            Showing <strong className="text-cdtext">one activity</strong> linked from the Dashboard (Peak eFTP source).
                        </span>
                        {typeof clearActivityLogFilters === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearActivityLogFilters()}
                                className="shrink-0 px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdborder/40"
                            >
                                Show full log
                            </button>
                        )}
                    </div>
                )}

                {singleDayFilterYmd && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cdaccent/40 bg-cdaccent/10 px-3 py-2 text-sm text-cdtext">
                        <span>
                            Showing activities on{' '}
                            <strong className="text-cdtext">
                                {formatDateDDMMYYYY(`${singleDayFilterYmd}T12:00:00`)}
                            </strong>
                        </span>
                        {typeof clearDayFilter === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearDayFilter()}
                                className="shrink-0 px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdborder/40 cd-focus-ring"
                            >
                                Back to previous view
                            </button>
                        )}
                    </div>
                )}

                {logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/35 bg-blue-500/[0.08] px-3 py-2 text-sm text-cdtext">
                        <span>
                            Showing activities from{' '}
                            <strong className="text-cdtext">
                                {formatDateDDMMYYYY(`${logDateRangeFilter.startYmd}T12:00:00`)} –{' '}
                                {formatDateDDMMYYYY(`${logDateRangeFilter.endYmd}T12:00:00`)}
                            </strong>{' '}
                            (from Dashboard Volume).
                        </span>
                        {typeof clearActivityLogFilters === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearActivityLogFilters()}
                                className="shrink-0 px-3 py-1.5 rounded-md border border-cdborder bg-cdsurface text-xs font-bold text-cdaccent hover:bg-cdborder/40"
                            >
                                Show full log
                            </button>
                        )}
                    </div>
                )}

                {!activities ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-4">
                        <Loader2 className="animate-spin text-cdprimary" size={32} />
                        <p>Loading Activities...</p>
                    </div>
                ) : isolateActivityId && !isolatedActivity ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-3 border border-dashed border-cdborder rounded-lg p-6">
                        <AlertTriangle size={32} className="text-amber-500/90" />
                        <p className="text-sm text-cdtext text-center">That activity is not in your log (it may have been removed).</p>
                        {typeof clearActivityLogFilters === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearActivityLogFilters()}
                                className="px-4 py-2 rounded-lg border border-cdborder bg-cdsurface text-sm font-bold text-cdaccent hover:bg-cdborder/30"
                            >
                                Show full log
                            </button>
                        )}
                    </div>
                ) : logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd && rangeFilteredActivities?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-3 border border-dashed border-cdborder rounded-lg p-6">
                        <AlertTriangle size={32} className="text-amber-500/90" />
                        <p className="text-sm text-cdtext text-center">No activities in this date range in your log.</p>
                        {typeof clearActivityLogFilters === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearActivityLogFilters()}
                                className="px-4 py-2 rounded-lg border border-cdborder bg-cdsurface text-sm font-bold text-cdaccent hover:bg-cdborder/30"
                            >
                                Show full log
                            </button>
                        )}
                    </div>
                ) : singleDayFilterYmd && processedActivities.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-3 border border-dashed border-cdborder rounded-lg p-6">
                        <AlertTriangle size={32} className="text-amber-500/90" />
                        <p className="text-sm text-cdtext text-center">
                            No activities on{' '}
                            {formatDateDDMMYYYY(`${singleDayFilterYmd}T12:00:00`)} in your log.
                        </p>
                        {typeof clearDayFilter === 'function' && (
                            <button
                                type="button"
                                onClick={() => clearDayFilter()}
                                className="px-4 py-2 rounded-lg border border-cdborder bg-cdsurface text-sm font-bold text-cdaccent hover:bg-cdborder/30 cd-focus-ring"
                            >
                                Back to previous view
                            </button>
                        )}
                    </div>
                ) : !isolateActivityId && !(logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd) && !singleDayFilterYmd && processedActivities.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-cdborder rounded-lg p-6">
                        <AlertTriangle size={32} className="text-cdmuted" aria-hidden />
                        <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-cdtext">No activities in your log</p>
                            <p className="text-xs text-cdmuted">Sync from Intervals.icu above, or import a JSON backup on the Import tab.</p>
                        </div>
                        {typeof onOpenImportTab === 'function' && (
                            <button
                                type="button"
                                onClick={onOpenImportTab}
                                className="px-4 py-2 rounded-cdmd bg-cdprimary text-cdonprimary text-sm font-bold hover:brightness-105 cd-focus-ring"
                            >
                                Open import tab
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                        <ActivityLogView
                            activities={logTableActivities}
                            sortConfig={sortConfig}
                            onSort={requestSort}
                            onDelete={handleDeleteSingle}
                            onEdit={setEditingActivity}
                            onViewDetail={setDetailActivity}
                            isGroupedView={logTableGrouped}
                            isYearExpanded={isYearExpanded}
                            onToggleYear={toggleYear}
                            isMonthExpanded={isMonthExpanded}
                            onToggleMonth={toggleMonth}
                            showBulkSelect
                            selectedActivityIds={bulk.bulkSelectedIds}
                            onToggleSelectRow={bulk.toggleBulkSelectOne}
                            allVisibleSelected={bulk.allVisibleSelected}
                            onToggleSelectAllVisible={bulk.toggleSelectAllVisible}
                            onOpenProfiler={onOpenProfilerFromActivity}
                            profilerClimbByActivityId={profilerClimbByActivityId}
                            profileFtp={profileFtp}
                            profileMaxHr={profileMaxHr}
                            getStravaToken={getStravaToken}
                            visibleColumns={visibleColumns}
                            onFilterByGearId={onFilterByGearId}
                            onFilterByDay={onFilterByDay}
                            singleDayFilterYmd={singleDayFilterYmd}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
