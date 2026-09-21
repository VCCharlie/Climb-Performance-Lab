import React, { useMemo } from 'react';
import {
    Search, Loader2, Trash, Split, RefreshCw, ChevronDown, Link2, Activity,
} from 'lucide-react';
import ActivityColumnPicker from './ActivityColumnPicker';
import ActivityLogFilterPanel from './activity-log-filters/ActivityLogFilterPanel';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import { SegmentedControl, cn } from '../ui';

/**
 * Activity Log toolbar: search, indoor filter, tools menu, quick chips, metric ranges, bulk actions.
 */
const ActivityLogFilterBar = ({
    // Search & layout
    search,
    onSearchChange,
    indoorFilter,
    onIndoorFilterChange,
    activeSportTypes,
    onActiveSportTypesChange,
    toggleSportType,
    logFilterPresets,
    activeLogFilterPresetId,
    detectedLogFilterPresetId,
    onApplyLogFilterPreset,
    onResetLogFilters,
    useCardLayout,
    logFiltersPanelOpen,
    onLogFiltersPanelOpenChange,
    showUtilMenu,
    onShowUtilMenuChange,
    utilMenuRef,
    utilMenuButtonRef,
    // Column visibility
    visibleKeys,
    activePreset,
    applyPreset,
    toggleColumn,
    isColumnVisible,
    // Refresh
    onRefresh,
    isManualRefreshing,
    onManualRefresh,
    // Tools menu actions
    onFindDuplicates,
    onClearDatabase,
    bulkSelectedCount = 0,
    activitiesCount,
    isDeleting,
    // Quick filter chips
    thisWeekOnly,
    onThisWeekOnlyChange,
    rollingDays,
    onRollingDaysChange,
    stravaGetToken,
    stravaLinkedOnly,
    onStravaLinkedOnlyChange,
    noStravaLinkOnly,
    onNoStravaLinkOnlyChange,
    possibleDuplicatesOnly,
    onPossibleDuplicatesOnlyChange,
    noPowerOnly,
    onNoPowerOnlyChange,
    withPowerOnly,
    onWithPowerOnlyChange,
    highLoadOnly,
    onHighLoadOnlyChange,
    longRideOnly,
    onLongRideOnlyChange,
    missingHrOnly,
    onMissingHrOnlyChange,
    hasTagOnly,
    onHasTagOnlyChange,
    minTss,
    onMinTssChange,
    // Gear filter
    gearFilterOptions,
    filterGearId,
    onFilterGearIdChange,
    // Metric ranges
    activityLogRangesExpanded,
    onActivityLogRangesExpandedChange,
    metricRangeActive,
    clearMetricFilters,
    activeMetricPresetIds,
    toggleMetricPreset,
    clearActiveMetricPresets,
    filterDistMin,
    onFilterDistMinChange,
    filterDistMax,
    onFilterDistMaxChange,
    filterSpeedMin,
    onFilterSpeedMinChange,
    filterSpeedMax,
    onFilterSpeedMaxChange,
    filterPowerMin,
    onFilterPowerMinChange,
    filterPowerMax,
    onFilterPowerMaxChange,
    filterDurMinMin,
    onFilterDurMinMinChange,
    filterDurMaxMin,
    onFilterDurMaxMinChange,
    filterElevMin,
    onFilterElevMinChange,
    filterElevMax,
    onFilterElevMaxChange,
    filterKjMin,
    onFilterKjMinChange,
    filterKjMax,
    onFilterKjMaxChange,
    filterDecMin,
    onFilterDecMinChange,
    filterDecMax,
    onFilterDecMaxChange,
    filterThrMin,
    onFilterThrMinChange,
    filterThrMax,
    onFilterThrMaxChange,
    filterRaceMin,
    onFilterRaceMinChange,
    filterRaceMax,
    onFilterRaceMaxChange,
    // Bulk actions
    onBulkEdit,
    onBulkSetGravelRide,
    onBulkSetMtbRide,
    onBulkSetEbikeRide,
    onExportCsv,
    onExportXlsx,
    isExportingXlsx = false,
    onMarkRecovery,
    recoveryTss = 35,
    onStravaEnrich,
    onStravaDescriptionBackfill,
    onDecouplingBackfill,
    onMergePair,
    canMergePair,
    mergePairHint,
    onDeleteSelected,
    onClearSelection,
    isBulkSaving,
    isStravaEnriching,
    isStravaDescBackfilling = false,
    isDecouplingBackfilling = false,
    canDecouplingBackfill = false,
    filterBarRootRef,
    activities = [],
}) => {
    const mobilePanelExpanded = useCardLayout && logFiltersPanelOpen;

    const activeFilterCount = useMemo(() => [
        thisWeekOnly,
        rollingDays != null,
        stravaLinkedOnly,
        noStravaLinkOnly,
        possibleDuplicatesOnly,
        noPowerOnly,
        withPowerOnly,
        highLoadOnly,
        longRideOnly,
        missingHrOnly,
        hasTagOnly,
        activeSportTypes.length > 0,
        Boolean(filterGearId),
        metricRangeActive,
        indoorFilter !== 'all',
    ].filter(Boolean).length, [
        thisWeekOnly, rollingDays, stravaLinkedOnly, noStravaLinkOnly, possibleDuplicatesOnly, noPowerOnly, withPowerOnly,
        highLoadOnly, longRideOnly, missingHrOnly, hasTagOnly, activeSportTypes,
        filterGearId, metricRangeActive, indoorFilter,
    ]);

    const columnPicker = (
        <ActivityColumnPicker
            visibleKeys={visibleKeys}
            activePreset={activePreset}
            applyPreset={applyPreset}
            toggleColumn={toggleColumn}
            isColumnVisible={isColumnVisible}
            className="flex shrink-0"
        />
    );

    return (
    <div
        ref={filterBarRootRef}
        className={cn(
            'shrink-0 space-y-3 mb-3 lg:mb-4 custom-scrollbar pr-0.5',
            useCardLayout
                ? cn(
                    showUtilMenu ? 'overflow-visible' : 'overflow-y-auto',
                    mobilePanelExpanded
                        ? 'max-h-[min(85vh,100%)] landscape:max-h-[min(92vh,100%)]'
                        : 'max-h-none',
                )
                : 'lg:max-h-none lg:overflow-visible',
        )}
    >
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div
                className={cn(
                    'w-full md:w-auto flex-1 min-w-0 gap-2',
                    useCardLayout ? 'flex flex-col' : 'flex',
                )}
            >
                <div className={cn('relative min-w-0', useCardLayout ? 'w-full' : 'flex-1 min-w-0')}>
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted pointer-events-none" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search (name, description, or 4-2-2024)..."
                        aria-label="Search activities by name, description, or date"
                        className="w-full min-h-9 bg-cdbg border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus-visible:border-cdprimary/60 focus-visible:ring-2 focus-visible:ring-cdprimary/15"
                    />
                </div>
                <div className={cn('flex flex-wrap items-center gap-2', useCardLayout && 'w-full')}>
                    <SegmentedControl
                        size="sm"
                        dense
                        caps={false}
                        value={indoorFilter}
                        onChange={(v) => {
                            onIndoorFilterChange(v);
                            onActiveSportTypesChange([]);
                        }}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'outdoor', label: 'Out' },
                            { value: 'indoor', label: 'In' },
                        ]}
                        aria-label="Venue filter"
                        className="shrink-0"
                    />
                    <label className="flex items-center gap-1.5 text-[10px] text-cdmuted shrink-0 min-w-0">
                        <span className="font-bold uppercase text-[9px]">Preset</span>
                        <select
                            value={detectedLogFilterPresetId || activeLogFilterPresetId || 'all'}
                            onChange={(e) => onApplyLogFilterPreset(e.target.value)}
                            className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[9rem] min-w-0"
                            title="Quick filter presets (saved on this device)"
                        >
                            {logFilterPresets.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={onResetLogFilters}
                        className="text-[9px] text-cdmuted hover:text-cdaccent underline shrink-0"
                        title="Clear search, gear, metrics, and chip filters"
                    >
                        Reset filters
                    </button>
                    {!useCardLayout && columnPicker}
                </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end items-center min-w-0">
                {useCardLayout && columnPicker}
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onManualRefresh}
                        disabled={isManualRefreshing}
                        className="flex items-center justify-center w-9 h-9 rounded border bg-cdsurface border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/50 transition-colors group disabled:opacity-50 cd-focus-ring focus:outline-none"
                        title="Refresh data"
                        aria-label="Refresh data"
                    >
                        <RefreshCw size={14} className={isManualRefreshing ? 'animate-spin' : 'group-active:animate-spin'} aria-hidden="true" />
                    </button>
                )}
                <div className={`relative flex-1 min-w-0 md:flex-none md:w-auto max-w-full ${showUtilMenu ? 'z-[60]' : ''}`} ref={utilMenuRef}>
                    <button
                        ref={utilMenuButtonRef}
                        type="button"
                        onClick={() => onShowUtilMenuChange((v) => !v)}
                        aria-expanded={showUtilMenu}
                        aria-haspopup="menu"
                        className="flex items-center justify-center gap-1.5 px-3 h-9 w-full md:w-auto rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-cdprimary/50 transition-all cd-focus-ring focus:outline-none"
                    >
                        Tools <ChevronDown size={14} className={showUtilMenu ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
                    </button>
                    <AnchoredDropdownPortal
                        open={showUtilMenu}
                        anchorRef={utilMenuButtonRef}
                        onClose={() => onShowUtilMenuChange(false)}
                        minWidth={224}
                    >
                        <button
                            type="button"
                            onClick={onFindDuplicates}
                            disabled={!activitiesCount}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-cdborder disabled:opacity-40 cd-focus-ring focus:outline-none"
                            role="menuitem"
                        >
                            <Split size={14} aria-hidden="true" /> Duplicates
                        </button>
                        {stravaGetToken && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onStravaDescriptionBackfill?.();
                                    onShowUtilMenuChange(false);
                                }}
                                disabled={isStravaDescBackfilling}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-cdtext hover:bg-cdborder disabled:opacity-40 cd-focus-ring focus:outline-none"
                            >
                                {isStravaDescBackfilling ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                                Strava descriptions
                            </button>
                        )}
                        {canDecouplingBackfill && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onDecouplingBackfill?.();
                                    onShowUtilMenuChange(false);
                                }}
                                disabled={isDecouplingBackfilling}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-cdtext hover:bg-cdborder disabled:opacity-40 cd-focus-ring focus:outline-none"
                            >
                                {isDecouplingBackfilling ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Activity size={14} aria-hidden="true" />}
                                Decoupling backfill
                            </button>
                        )}
                        <div className="border-t border-cdborder" />
                        <button
                            type="button"
                            onClick={onClearDatabase}
                            disabled={isDeleting || !activitiesCount}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-cdborder disabled:opacity-40 cd-focus-ring focus:outline-none"
                        >
                            {isDeleting ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Trash size={14} aria-hidden="true" />}
                            Clear DB
                        </button>
                    </AnchoredDropdownPortal>
                </div>
            </div>
        </div>

        <ActivityLogFilterPanel
            collapsible
            collapsed={!logFiltersPanelOpen}
            onCollapsedChange={onLogFiltersPanelOpenChange}
            activeFilterCount={activeFilterCount}
            compact={useCardLayout}
            search={search}
            onSearchChange={onSearchChange}
            onResetLogFilters={onResetLogFilters}
            activities={activities}
            thisWeekOnly={thisWeekOnly}
            onThisWeekOnlyChange={onThisWeekOnlyChange}
            rollingDays={rollingDays}
            onRollingDaysChange={onRollingDaysChange}
            stravaGetToken={stravaGetToken}
            stravaLinkedOnly={stravaLinkedOnly}
            onStravaLinkedOnlyChange={onStravaLinkedOnlyChange}
            noStravaLinkOnly={noStravaLinkOnly}
            onNoStravaLinkOnlyChange={onNoStravaLinkOnlyChange}
            possibleDuplicatesOnly={possibleDuplicatesOnly}
            onPossibleDuplicatesOnlyChange={onPossibleDuplicatesOnlyChange}
            noPowerOnly={noPowerOnly}
            onNoPowerOnlyChange={onNoPowerOnlyChange}
            withPowerOnly={withPowerOnly}
            onWithPowerOnlyChange={onWithPowerOnlyChange}
            highLoadOnly={highLoadOnly}
            onHighLoadOnlyChange={onHighLoadOnlyChange}
            longRideOnly={longRideOnly}
            onLongRideOnlyChange={onLongRideOnlyChange}
            missingHrOnly={missingHrOnly}
            onMissingHrOnlyChange={onMissingHrOnlyChange}
            hasTagOnly={hasTagOnly}
            onHasTagOnlyChange={onHasTagOnlyChange}
            activeSportTypes={activeSportTypes}
            onActiveSportTypesChange={onActiveSportTypesChange}
            toggleSportType={toggleSportType}
            indoorFilter={indoorFilter}
            onIndoorFilterChange={onIndoorFilterChange}
            minTss={minTss}
            onMinTssChange={onMinTssChange}
            gearFilterOptions={gearFilterOptions}
            filterGearId={filterGearId}
            onFilterGearIdChange={onFilterGearIdChange}
            activityLogRangesExpanded={activityLogRangesExpanded}
            onActivityLogRangesExpandedChange={onActivityLogRangesExpandedChange}
            metricRangeActive={metricRangeActive}
            clearMetricFilters={clearMetricFilters}
            activeMetricPresetIds={activeMetricPresetIds}
            toggleMetricPreset={toggleMetricPreset}
            clearActiveMetricPresets={clearActiveMetricPresets}
            filterDistMin={filterDistMin}
            onFilterDistMinChange={onFilterDistMinChange}
            filterDistMax={filterDistMax}
            onFilterDistMaxChange={onFilterDistMaxChange}
            filterSpeedMin={filterSpeedMin}
            onFilterSpeedMinChange={onFilterSpeedMinChange}
            filterSpeedMax={filterSpeedMax}
            onFilterSpeedMaxChange={onFilterSpeedMaxChange}
            filterPowerMin={filterPowerMin}
            onFilterPowerMinChange={onFilterPowerMinChange}
            filterPowerMax={filterPowerMax}
            onFilterPowerMaxChange={onFilterPowerMaxChange}
            filterDurMinMin={filterDurMinMin}
            onFilterDurMinMinChange={onFilterDurMinMinChange}
            filterDurMaxMin={filterDurMaxMin}
            onFilterDurMaxMinChange={onFilterDurMaxMinChange}
            filterElevMin={filterElevMin}
            onFilterElevMinChange={onFilterElevMinChange}
            filterElevMax={filterElevMax}
            onFilterElevMaxChange={onFilterElevMaxChange}
            filterKjMin={filterKjMin}
            onFilterKjMinChange={onFilterKjMinChange}
            filterKjMax={filterKjMax}
            onFilterKjMaxChange={onFilterKjMaxChange}
            filterDecMin={filterDecMin}
            onFilterDecMinChange={onFilterDecMinChange}
            filterDecMax={filterDecMax}
            onFilterDecMaxChange={onFilterDecMaxChange}
            filterThrMin={filterThrMin}
            onFilterThrMinChange={onFilterThrMinChange}
            filterThrMax={filterThrMax}
            onFilterThrMaxChange={onFilterThrMaxChange}
            filterRaceMin={filterRaceMin}
            onFilterRaceMinChange={onFilterRaceMinChange}
            filterRaceMax={filterRaceMax}
            onFilterRaceMaxChange={onFilterRaceMaxChange}
            bulkSelectedCount={bulkSelectedCount}
            onBulkEdit={onBulkEdit}
            onBulkSetGravelRide={onBulkSetGravelRide}
            onBulkSetMtbRide={onBulkSetMtbRide}
            onBulkSetEbikeRide={onBulkSetEbikeRide}
            onExportCsv={onExportCsv}
            onExportXlsx={onExportXlsx}
            isExportingXlsx={isExportingXlsx}
            onMarkRecovery={onMarkRecovery}
            recoveryTss={recoveryTss}
            onStravaEnrich={onStravaEnrich}
            onStravaDescriptionBackfill={onStravaDescriptionBackfill}
            onDecouplingBackfill={onDecouplingBackfill}
            onMergePair={onMergePair}
            canMergePair={canMergePair}
            mergePairHint={mergePairHint}
            onDeleteSelected={onDeleteSelected}
            onClearSelection={onClearSelection}
            isBulkSaving={isBulkSaving}
            isStravaEnriching={isStravaEnriching}
            isStravaDescBackfilling={isStravaDescBackfilling}
            isDecouplingBackfilling={isDecouplingBackfilling}
            canDecouplingBackfill={canDecouplingBackfill}
            isDeleting={isDeleting}
        />
    </div>
    );
};

export default ActivityLogFilterBar;
