import React, { useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { formatNlNumber } from '../../../utils/formatters';
import { buildActivityLogActiveFilterPills } from '../../../utils/activityLogActiveFilterPills';
import ActiveFiltersBar from './ActiveFiltersBar';
import ActivityLogFilterDrawer from './ActivityLogFilterDrawer';
import PrimaryQuickFilterRow from './PrimaryQuickFilterRow';
import BulkActionsSection from './BulkActionsSection';
import { cn } from '../../ui';

/**
 * Compact filter shell: active pills + primary chips + drawer for full controls.
 */
export default function ActivityLogFilterPanel({
    collapsible = false,
    collapsed = false,
    onCollapsedChange,
    activeFilterCount = 0,
    compact = false,
    onResetLogFilters,
    ...sectionProps
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const bulkSelectedCount = sectionProps.bulkSelectedCount ?? 0;

    const activePills = useMemo(
        () => buildActivityLogActiveFilterPills({
            ...sectionProps,
            onResetLogFilters,
        }),
        [sectionProps, onResetLogFilters],
    );

    const drawerSectionProps = {
        ...sectionProps,
        onResetLogFilters,
    };

    const openDrawer = () => setDrawerOpen(true);

    const drawer = (
        <ActivityLogFilterDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            activeFilterCount={activeFilterCount}
            initialTab={bulkSelectedCount > 0 ? 'bulk' : 'quick'}
            sectionProps={drawerSectionProps}
        />
    );

    const filterShell = (
        <>
            <ActiveFiltersBar
                pills={activePills}
                onClearAll={onResetLogFilters}
            />

            <div className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-cdborder/30">
                <PrimaryQuickFilterRow
                    {...sectionProps}
                />
                <button
                    type="button"
                    onClick={openDrawer}
                    className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-cdborder bg-cdsurface px-3 py-1 min-h-[28px] text-[10px] font-bold text-cdtext hover:border-cdaccent/50 cd-focus-ring cd-transition"
                    aria-haspopup="dialog"
                >
                    <SlidersHorizontal size={13} aria-hidden />
                    All filters
                    {activeFilterCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full bg-cdprimarycontainer text-cdonprimarycontainer text-[9px] font-bold tabular-nums">
                            {activeFilterCount}
                        </span>
                    ) : null}
                </button>
            </div>

            {bulkSelectedCount > 0 ? (
                <div className="px-3 py-1.5 border-b border-cdborder/30 flex flex-wrap items-center justify-between gap-2 bg-cdaccent/5">
                    <span className="text-[10px] text-cdtext tabular-nums">
                        <strong>{formatNlNumber(bulkSelectedCount)}</strong> selected for bulk actions
                    </span>
                    <button
                        type="button"
                        onClick={openDrawer}
                        className="text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded px-1"
                    >
                        Open bulk tab
                    </button>
                </div>
            ) : null}

            <BulkActionsSection {...sectionProps} compactBar />
        </>
    );

    if (collapsible && collapsed) {
        return (
            <div className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/30 overflow-hidden">
                <ActiveFiltersBar
                    pills={activePills}
                    onClearAll={onResetLogFilters}
                />
                <div className="flex items-center gap-2 px-3 py-2 min-h-9">
                    <button
                        type="button"
                        onClick={() => onCollapsedChange?.((v) => !v)}
                        className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left cd-type-subsection cd-transition hover:bg-cdborder/10 cd-focus-ring rounded-sm px-1 py-0.5"
                        aria-expanded={false}
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            Filters & bulk
                            {activeFilterCount > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cdprimarycontainer text-cdonprimarycontainer text-[10px] font-bold tabular-nums">
                                    {activeFilterCount}
                                </span>
                            ) : null}
                            {bulkSelectedCount > 0 ? (
                                <span
                                    className="text-[10px] text-cdmuted tabular-nums font-normal normal-case tracking-normal"
                                    title="Activities selected for bulk actions"
                                >
                                    {formatNlNumber(bulkSelectedCount)} selected
                                </span>
                            ) : null}
                        </span>
                        <ChevronDown size={14} className="text-cdmuted shrink-0" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openDrawer}
                        className="inline-flex items-center gap-1 shrink-0 rounded-full border border-cdborder bg-cdsurface px-2.5 py-1 min-h-[28px] text-[10px] font-bold text-cdtext hover:border-cdaccent/50 cd-focus-ring cd-transition"
                        aria-haspopup="dialog"
                    >
                        <SlidersHorizontal size={12} aria-hidden />
                        Filters
                    </button>
                </div>
                {drawer}
            </div>
        );
    }

    if (collapsible) {
        return (
            <div className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/30 overflow-hidden">
                <button
                    type="button"
                    onClick={() => onCollapsedChange?.((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-9 text-left cd-type-subsection cd-transition hover:bg-cdborder/10 cd-focus-ring border-b border-cdborder/30"
                    aria-expanded
                >
                    <span className="flex items-center gap-2 min-w-0">
                        Filters & bulk
                        {activeFilterCount > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cdprimarycontainer text-cdonprimarycontainer text-[10px] font-bold tabular-nums">
                                {activeFilterCount}
                            </span>
                        ) : null}
                    </span>
                    <ChevronDown
                        size={14}
                        className={cn('text-cdmuted shrink-0 cd-transition rotate-180')}
                        aria-hidden
                    />
                </button>
                {filterShell}
                {drawer}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/30 overflow-hidden">
            {filterShell}
            {drawer}
        </div>
    );
}
