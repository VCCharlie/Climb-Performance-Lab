import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatNlNumber } from '../../../utils/formatters';
import QuickFilterChips from './QuickFilterChips';
import MetricRangesSection from './MetricRangesSection';
import BulkActionsSection from './BulkActionsSection';
import { cn } from '../../ui';

/**
 * Unified Activity Log filter + bulk panel — one card, section dividers (no nested boxes).
 */
export default function ActivityLogFilterPanel({
    collapsible = false,
    collapsed = false,
    onCollapsedChange,
    activeFilterCount = 0,
    compact = false,
    ...sectionProps
}) {
    const bulkSelectedCount = sectionProps.bulkSelectedCount ?? 0;

    const body = (
        <>
            <div className="px-3 py-2.5">
                <QuickFilterChips compact={compact} {...sectionProps} />
            </div>
            <MetricRangesSection
                expanded={sectionProps.activityLogRangesExpanded}
                onExpandedChange={sectionProps.onActivityLogRangesExpandedChange}
                metricRangeActive={sectionProps.metricRangeActive}
                clearMetricFilters={sectionProps.clearMetricFilters}
                activeMetricPresetIds={sectionProps.activeMetricPresetIds}
                toggleMetricPreset={sectionProps.toggleMetricPreset}
                clearActiveMetricPresets={sectionProps.clearActiveMetricPresets}
                filterDistMin={sectionProps.filterDistMin}
                onFilterDistMinChange={sectionProps.onFilterDistMinChange}
                filterDistMax={sectionProps.filterDistMax}
                onFilterDistMaxChange={sectionProps.onFilterDistMaxChange}
                filterSpeedMin={sectionProps.filterSpeedMin}
                onFilterSpeedMinChange={sectionProps.onFilterSpeedMinChange}
                filterSpeedMax={sectionProps.filterSpeedMax}
                onFilterSpeedMaxChange={sectionProps.onFilterSpeedMaxChange}
                filterPowerMin={sectionProps.filterPowerMin}
                onFilterPowerMinChange={sectionProps.onFilterPowerMinChange}
                filterPowerMax={sectionProps.filterPowerMax}
                onFilterPowerMaxChange={sectionProps.onFilterPowerMaxChange}
                filterDurMinMin={sectionProps.filterDurMinMin}
                onFilterDurMinMinChange={sectionProps.onFilterDurMinMinChange}
                filterDurMaxMin={sectionProps.filterDurMaxMin}
                onFilterDurMaxMinChange={sectionProps.onFilterDurMaxMinChange}
                filterElevMin={sectionProps.filterElevMin}
                onFilterElevMinChange={sectionProps.onFilterElevMinChange}
                filterElevMax={sectionProps.filterElevMax}
                onFilterElevMaxChange={sectionProps.onFilterElevMaxChange}
                filterKjMin={sectionProps.filterKjMin}
                onFilterKjMinChange={sectionProps.onFilterKjMinChange}
                filterKjMax={sectionProps.filterKjMax}
                onFilterKjMaxChange={sectionProps.onFilterKjMaxChange}
                filterDecMin={sectionProps.filterDecMin}
                onFilterDecMinChange={sectionProps.onFilterDecMinChange}
                filterDecMax={sectionProps.filterDecMax}
                onFilterDecMaxChange={sectionProps.onFilterDecMaxChange}
                filterThrMin={sectionProps.filterThrMin}
                onFilterThrMinChange={sectionProps.onFilterThrMinChange}
                filterThrMax={sectionProps.filterThrMax}
                onFilterThrMaxChange={sectionProps.onFilterThrMaxChange}
                filterRaceMin={sectionProps.filterRaceMin}
                onFilterRaceMinChange={sectionProps.onFilterRaceMinChange}
                filterRaceMax={sectionProps.filterRaceMax}
                onFilterRaceMaxChange={sectionProps.onFilterRaceMaxChange}
            />
            <BulkActionsSection
                bulkSelectedCount={sectionProps.bulkSelectedCount}
                onBulkEdit={sectionProps.onBulkEdit}
                onBulkSetGravelRide={sectionProps.onBulkSetGravelRide}
                onBulkSetMtbRide={sectionProps.onBulkSetMtbRide}
                onBulkSetEbikeRide={sectionProps.onBulkSetEbikeRide}
                onExportCsv={sectionProps.onExportCsv}
                onExportXlsx={sectionProps.onExportXlsx}
                isExportingXlsx={sectionProps.isExportingXlsx}
                onMarkRecovery={sectionProps.onMarkRecovery}
                recoveryTss={sectionProps.recoveryTss}
                stravaGetToken={sectionProps.stravaGetToken}
                onStravaEnrich={sectionProps.onStravaEnrich}
                onStravaDescriptionBackfill={sectionProps.onStravaDescriptionBackfill}
                onDecouplingBackfill={sectionProps.onDecouplingBackfill}
                onMergePair={sectionProps.onMergePair}
                canMergePair={sectionProps.canMergePair}
                mergePairHint={sectionProps.mergePairHint}
                onDeleteSelected={sectionProps.onDeleteSelected}
                onClearSelection={sectionProps.onClearSelection}
                isBulkSaving={sectionProps.isBulkSaving}
                isStravaEnriching={sectionProps.isStravaEnriching}
                isStravaDescBackfilling={sectionProps.isStravaDescBackfilling}
                isDecouplingBackfilling={sectionProps.isDecouplingBackfilling}
                canDecouplingBackfill={sectionProps.canDecouplingBackfill}
                isDeleting={sectionProps.isDeleting}
            />
        </>
    );

    if (!collapsible) {
        return (
            <div className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/30 overflow-hidden">
                {body}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/30 overflow-hidden">
            <button
                type="button"
                onClick={() => onCollapsedChange?.((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-9 text-left cd-type-subsection cd-transition hover:bg-cdborder/10 cd-focus-ring"
                aria-expanded={!collapsed}
            >
                <span className="flex items-center gap-2 min-w-0">
                    Filters & bulk
                    {activeFilterCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cdprimarycontainer text-cdonprimarycontainer text-[10px] font-bold tabular-nums">
                            {activeFilterCount}
                        </span>
                    ) : null}
                    {collapsed && bulkSelectedCount > 0 ? (
                        <span
                            className="text-[10px] text-cdmuted tabular-nums font-normal normal-case tracking-normal"
                            title="Activities selected for bulk actions"
                        >
                            {formatNlNumber(bulkSelectedCount)} selected
                        </span>
                    ) : null}
                </span>
                <ChevronDown
                    size={14}
                    className={cn('text-cdmuted shrink-0 cd-transition', !collapsed && 'rotate-180')}
                    aria-hidden
                />
            </button>
            {!collapsed ? body : null}
        </div>
    );
}
