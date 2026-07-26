import React from 'react';
import {
    Search, Loader2, Trash, Split, RefreshCw, ChevronDown, ChevronRight,
    Link2, GitMerge, Edit2,
} from 'lucide-react';
import ActivityColumnPicker from './ActivityColumnPicker';
import ActivityLogExportButtons from './ActivityLogExportButtons';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import { formatNlNumber } from '../../utils/formatters';
import { buildMarkRecoveryTooltip } from '../../utils/recoveryTss';
import { cn } from '../ui/cn';

/**
 * Activity Log toolbar: search, indoor filter, tools menu, quick chips, metric ranges, bulk actions.
 */
const ActivityLogFilterBar = ({
    // Search & layout
    search,
    onSearchChange,
    indoorFilter,
    onIndoorFilterChange,
    virtualRideChip,
    onVirtualRideChipChange,
    gravelRideChip,
    onGravelRideChipChange,
    mtbRideChip,
    onMtbRideChipChange,
    ebikeRideChip,
    onEbikeRideChipChange,
    logFilterPresets,
    activeLogFilterPresetId,
    detectedLogFilterPresetId,
    onApplyLogFilterPreset,
    onResetLogFilters,
    useCardLayout,
    logMobileFiltersOpen,
    onLogMobileFiltersOpenChange,
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
    applyMetricPreset,
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
    onMergePair,
    onDeleteSelected,
    onClearSelection,
    isBulkSaving,
    isStravaEnriching,
    isStravaDescBackfilling = false,
    filterBarRootRef,
}) => {
    const mobilePanelExpanded = useCardLayout && logMobileFiltersOpen;

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
                        : 'max-h-[min(38vh,100%)] landscape:max-h-[min(52vh,100%)]',
                )
                : 'lg:max-h-none lg:overflow-visible',
        )}
    >
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex gap-2 w-full md:w-auto flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted" />
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search (name or 4-2-2024)..."
                        className="w-full bg-cdbg border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus:border-yellow-400"
                    />
                </div>
                <div className="flex bg-cdbg rounded border border-cdborder p-1 shrink-0">
                    <button
                        type="button"
                        aria-pressed={indoorFilter === 'all'}
                        onClick={() => { onIndoorFilterChange('all'); onVirtualRideChipChange(false); }}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'all' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        aria-pressed={indoorFilter === 'outdoor'}
                        onClick={() => { onIndoorFilterChange('outdoor'); onVirtualRideChipChange(false); }}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'outdoor' ? 'bg-green-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        Out
                    </button>
                    <button
                        type="button"
                        aria-pressed={indoorFilter === 'indoor'}
                        onClick={() => { onIndoorFilterChange('indoor'); onVirtualRideChipChange(false); }}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'indoor' ? 'bg-orange-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                    >
                        In
                    </button>
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-cdmuted shrink-0">
                    <span className="font-bold uppercase text-[9px]">Preset</span>
                    <select
                        value={detectedLogFilterPresetId || activeLogFilterPresetId || 'all'}
                        onChange={(e) => onApplyLogFilterPreset(e.target.value)}
                        className="bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px] max-w-[9rem]"
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
                <ActivityColumnPicker
                    visibleKeys={visibleKeys}
                    activePreset={activePreset}
                    applyPreset={applyPreset}
                    toggleColumn={toggleColumn}
                    isColumnVisible={isColumnVisible}
                    className="flex shrink-0"
                />
            </div>
            <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onManualRefresh}
                        disabled={isManualRefreshing}
                        className="flex items-center justify-center w-9 h-9 rounded border bg-cdsurface border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/50 transition-colors group disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
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
                        className="flex items-center justify-center gap-1.5 px-3 h-9 w-full md:w-auto rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-yellow-400 transition-all focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
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
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-cdborder disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
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
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-cdtext hover:bg-cdborder disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                            >
                                {isStravaDescBackfilling ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                                Strava descriptions
                            </button>
                        )}
                        <div className="border-t border-cdborder" />
                        <button
                            type="button"
                            onClick={onClearDatabase}
                            disabled={isDeleting || !activitiesCount}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-cdborder disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                        >
                            {isDeleting ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : <Trash size={14} aria-hidden="true" />}
                            Clear DB
                        </button>
                    </AnchoredDropdownPortal>
                </div>
            </div>
        </div>

        {useCardLayout && (
            <button
                type="button"
                onClick={() => onLogMobileFiltersOpenChange((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-11 rounded-lg border border-cdborder bg-cdsurface text-xs font-bold text-cdtext cd-transition focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none cd-focus-ring"
                aria-expanded={logMobileFiltersOpen}
            >
                <span>{logMobileFiltersOpen ? 'Hide filters & bulk' : 'Filters & bulk actions'}</span>
                <ChevronDown size={14} className={`text-cdmuted cd-transition ${logMobileFiltersOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
        )}

        <div className={cn('space-y-3', useCardLayout && !logMobileFiltersOpen && 'hidden')}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-cdmuted uppercase shrink-0">Quick</span>
                <button
                    type="button"
                    onClick={() => {
                        onThisWeekOnlyChange((v) => !v);
                        onRollingDaysChange(null);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${thisWeekOnly ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    This week
                </button>
                {[7, 14, 30].map((d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => {
                            onRollingDaysChange((cur) => (cur === d ? null : d));
                            onThisWeekOnlyChange(false);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${rollingDays === d ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                    >
                        Last {d}d
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onStravaLinkedOnlyChange((v) => !v)}
                    disabled={!stravaGetToken}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${stravaLinkedOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'border-cdborder text-cdmuted hover:text-cdtext'} disabled:opacity-40`}
                >
                    Strava link
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onNoPowerOnlyChange((v) => {
                            const next = !v;
                            if (next) onWithPowerOnlyChange(false);
                            return next;
                        });
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${noPowerOnly ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    No power
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onWithPowerOnlyChange((v) => {
                            const next = !v;
                            if (next) onNoPowerOnlyChange(false);
                            return next;
                        });
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${withPowerOnly ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    With power
                </button>
                <button
                    type="button"
                    onClick={() => onHighLoadOnlyChange((v) => !v)}
                    title="Load (TSS) &gt; 120"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${highLoadOnly ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    High load
                </button>
                <button
                    type="button"
                    onClick={() => onLongRideOnlyChange((v) => !v)}
                    title="Distance &gt; 100 km"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${longRideOnly ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    Long ride
                </button>
                <button
                    type="button"
                    onClick={() => onMissingHrOnlyChange((v) => !v)}
                    title="Avg HR missing or zero"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${missingHrOnly ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    No HR
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (virtualRideChip) {
                            onVirtualRideChipChange(false);
                            onIndoorFilterChange('all');
                        } else {
                            onVirtualRideChipChange(true);
                            onGravelRideChipChange(false);
                            onMtbRideChipChange(false);
                            onEbikeRideChipChange(false);
                            onIndoorFilterChange('indoor');
                        }
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${virtualRideChip ? 'bg-orange-600/25 border-orange-500/50 text-orange-300' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    Virtual only
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (gravelRideChip) {
                            onGravelRideChipChange(false);
                        } else {
                            onGravelRideChipChange(true);
                            onMtbRideChipChange(false);
                            onEbikeRideChipChange(false);
                            onVirtualRideChipChange(false);
                            if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                        }
                    }}
                    title="Show activities stored as GravelRide"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${gravelRideChip ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-300' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    Gravel
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (mtbRideChip) {
                            onMtbRideChipChange(false);
                        } else {
                            onMtbRideChipChange(true);
                            onGravelRideChipChange(false);
                            onEbikeRideChipChange(false);
                            onVirtualRideChipChange(false);
                            if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                        }
                    }}
                    title="Show activities stored as MountainBikeRide"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${mtbRideChip ? 'bg-lime-600/25 border-lime-500/50 text-lime-200' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    MTB
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (ebikeRideChip) {
                            onEbikeRideChipChange(false);
                        } else {
                            onEbikeRideChipChange(true);
                            onGravelRideChipChange(false);
                            onMtbRideChipChange(false);
                            onVirtualRideChipChange(false);
                            if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                        }
                    }}
                    title="Show activities stored as EBikeRide"
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${ebikeRideChip ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'border-cdborder text-cdmuted hover:text-cdtext'}`}
                >
                    E-bike
                </button>
                <label className="flex items-center gap-1.5 text-[10px] text-cdmuted">
                    <span className="font-bold uppercase shrink-0">TSS &gt;</span>
                    <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="—"
                        value={minTss}
                        onChange={(e) => onMinTssChange(e.target.value)}
                        className="w-14 bg-cdbg border border-cdborder rounded px-1.5 py-0.5 text-cdtext text-[10px]"
                    />
                </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <label className="flex items-center gap-2 text-cdmuted min-w-0 flex-1 sm:flex-none sm:max-w-md">
                    <span className="font-bold uppercase text-[9px] shrink-0">Gear</span>
                    <select
                        value={filterGearId}
                        onChange={(e) => onFilterGearIdChange(e.target.value)}
                        className="min-w-0 flex-1 bg-cdbg border border-cdborder rounded px-2 py-1 text-cdtext text-[10px]"
                        title="Bikes used on activities matching your current filters (search, chips, ranges). Gear filter itself is excluded so you can switch bikes."
                    >
                        <option value="">All bikes</option>
                        {gearFilterOptions.map(({ id, label }) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                    </select>
                </label>
                {filterGearId && (
                    <button
                        type="button"
                        onClick={() => onFilterGearIdChange('')}
                        className="text-[9px] text-orange-400 hover:text-orange-300 underline shrink-0"
                    >
                        Clear gear
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2 border border-cdborder/60 rounded-lg p-2 bg-cdbg/20">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button
                        type="button"
                        onClick={() => onActivityLogRangesExpandedChange?.(!activityLogRangesExpanded)}
                        className="flex items-center gap-1.5 text-left shrink-0 text-[10px] font-bold text-cdtext uppercase hover:text-cdaccent"
                        aria-expanded={activityLogRangesExpanded}
                    >
                        {activityLogRangesExpanded ? <ChevronDown size={14} className="text-cdmuted" /> : <ChevronRight size={14} className="text-cdmuted" />}
                        Ranges
                    </button>
                    <span className="text-[9px] text-cdmuted hidden sm:inline">Dist · Spd · Pwr · Dur · Elev · kJ</span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ml-auto">
                        <button
                            type="button"
                            onClick={() => onActivityLogRangesExpandedChange?.(true)}
                            className="text-[9px] font-bold text-cdmuted hover:text-cdtext underline focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm"
                        >
                            Expand
                        </button>
                        <span className="text-cdborder">|</span>
                        <button
                            type="button"
                            onClick={() => onActivityLogRangesExpandedChange?.(false)}
                            className="text-[9px] font-bold text-cdmuted hover:text-cdtext underline focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm"
                        >
                            Collapse
                        </button>
                        {metricRangeActive && (
                            <button
                                type="button"
                                onClick={clearMetricFilters}
                                className="text-[9px] text-orange-400 hover:text-orange-300 underline focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-sm"
                            >
                                Clear ranges
                            </button>
                        )}
                    </div>
                </div>
                {activityLogRangesExpanded && (
                    <>
                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-[10px] text-cdmuted">
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">Dist</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={0.1} placeholder="min" value={filterDistMin} onChange={(e) => onFilterDistMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={0.1} placeholder="max" value={filterDistMax} onChange={(e) => onFilterDistMaxChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">Speed</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={0.1} placeholder="min" value={filterSpeedMin} onChange={(e) => onFilterSpeedMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={0.1} placeholder="max" value={filterSpeedMax} onChange={(e) => onFilterSpeedMaxChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">Power</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={1} placeholder="min" value={filterPowerMin} onChange={(e) => onFilterPowerMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={1} placeholder="max" value={filterPowerMax} onChange={(e) => onFilterPowerMaxChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">Duration</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={1} placeholder="min" value={filterDurMinMin} onChange={(e) => onFilterDurMinMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={1} placeholder="max" value={filterDurMaxMin} onChange={(e) => onFilterDurMaxMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">Elev</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={1} placeholder="min" value={filterElevMin} onChange={(e) => onFilterElevMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={1} placeholder="max" value={filterElevMax} onChange={(e) => onFilterElevMaxChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className="font-bold uppercase text-[9px]">kJ</span>
                                <span className="flex items-center gap-1">
                                    <input type="number" min={0} step={1} placeholder="min" value={filterKjMin} onChange={(e) => onFilterKjMinChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                    <span>–</span>
                                    <input type="number" min={0} step={1} placeholder="max" value={filterKjMax} onChange={(e) => onFilterKjMaxChange(e.target.value)} className="w-12 bg-cdbg border border-cdborder rounded px-1 py-0.5 text-cdtext" />
                                </span>
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] font-bold text-cdmuted uppercase shrink-0 mr-1">Presets</span>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterDurMaxMinChange('60'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Short &lt;1h</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterDurMinMinChange('240'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Long ≥4h</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterDistMinChange('50'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">≥50 km</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterDistMaxChange('30'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">≤30 km</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterSpeedMinChange('32'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Fast ≥32 km/h</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterSpeedMaxChange('26'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Easy ≤26 km/h</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterPowerMinChange('200'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Pwr ≥200 W</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterElevMinChange('1000'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Climb ≥1000 m</button>
                            <button type="button" onClick={() => applyMetricPreset(() => { onFilterKjMinChange('1500'); })} className="px-2 py-0.5 rounded border border-cdborder text-[9px] text-cdmuted hover:text-cdtext">Work ≥1500 kJ</button>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="text-cdmuted font-bold uppercase shrink-0">Bulk</span>
                <span className="text-cdmuted">{formatNlNumber(bulkSelectedCount)} selected</span>
                <button
                    type="button"
                    onClick={onBulkEdit}
                    disabled={bulkSelectedCount === 0 || isBulkSaving}
                    title="Apply type, gear, load, RPE, or FTP to all selected rows"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdaccent/50 text-cdaccent hover:bg-cdaccent/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    {isBulkSaving ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Edit2 size={12} aria-hidden="true" />}
                    Bulk edit
                </button>
                <button
                    type="button"
                    onClick={onBulkSetGravelRide}
                    disabled={bulkSelectedCount === 0 || isBulkSaving}
                    title="Set activity type to GravelRide for all selected rows"
                    className="px-2 py-1 rounded border border-fuchsia-400/45 text-fuchsia-300 hover:bg-fuchsia-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    Set Gravel
                </button>
                <button
                    type="button"
                    onClick={onBulkSetMtbRide}
                    disabled={bulkSelectedCount === 0 || isBulkSaving}
                    title="Set activity type to MountainBikeRide for all selected rows"
                    className="px-2 py-1 rounded border border-lime-500/40 text-lime-200 hover:bg-lime-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    Set MTB
                </button>
                <button
                    type="button"
                    onClick={onBulkSetEbikeRide}
                    disabled={bulkSelectedCount === 0 || isBulkSaving}
                    title="Set activity type to EBikeRide for all selected rows"
                    className="px-2 py-1 rounded border border-cyan-400/45 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    Set E-bike
                </button>
                <ActivityLogExportButtons
                    disabled={bulkSelectedCount === 0}
                    onExportCsv={onExportCsv}
                    onExportXlsx={onExportXlsx}
                    isExportingXlsx={isExportingXlsx}
                />
                <button
                    type="button"
                    onClick={onMarkRecovery}
                    disabled={bulkSelectedCount === 0}
                    title={buildMarkRecoveryTooltip(recoveryTss)}
                    className="px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/40 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    Mark recovery (TSS {recoveryTss})
                </button>
                {stravaGetToken && (
                    <>
                        <button
                            type="button"
                            onClick={onStravaEnrich}
                            disabled={isStravaEnriching || bulkSelectedCount === 0}
                            title="Auto-link selected rides to Strava, then enrich gear, route, HR, RPE, and segment badges (no manual Strava URL needed)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                        >
                            {isStravaEnriching ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Link2 size={12} aria-hidden="true" />}
                            Strava enrich
                        </button>
                        <button
                            type="button"
                            onClick={onStravaDescriptionBackfill}
                            disabled={isStravaDescBackfilling}
                            title="Fetch Strava activity description only (MyCols / ClimbFinder). No selection = next 80 Strava-linked rides still missing a description (newest first). Re-click until the banner says none remain."
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder text-cdmuted hover:text-cdaccent hover:border-cdaccent/40 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                        >
                            {isStravaDescBackfilling ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Link2 size={12} aria-hidden="true" />}
                            Strava descriptions
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={onMergePair}
                    disabled={bulkSelectedCount !== 2}
                    title="Select exactly two rows: Intervals + Strava import (strava_… id)"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    <GitMerge size={12} aria-hidden="true" /> Merge pair
                </button>
                <button
                    type="button"
                    onClick={onDeleteSelected}
                    disabled={bulkSelectedCount === 0 || isDeleting}
                    title="Remove selected activities from the log and cloud"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Trash size={12} aria-hidden="true" />}
                    Delete selected
                </button>
                <button
                    type="button"
                    onClick={onClearSelection}
                    disabled={bulkSelectedCount === 0}
                    className="text-cdmuted hover:text-cdtext underline disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                >
                    Clear selection
                </button>
                <span className="text-cdmuted hidden sm:inline">Row checkboxes · header selects visible</span>
            </div>
        </div>
    </div>
    );
};

export default ActivityLogFilterBar;
