import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn, SegmentedControl } from '../../ui';
import QuickFilterChips from './QuickFilterChips';
import MetricRangesSection from './MetricRangesSection';
import BulkActionsSection from './BulkActionsSection';

const FILTER_DRAWER_TABS = [
    { id: 'quick', label: 'Quick' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'bulk', label: 'Bulk' },
];

/**
 * Unified filter drawer — grouped controls replace nested collapsible sections.
 */
export default function ActivityLogFilterDrawer({
    open,
    onClose,
    activeFilterCount = 0,
    initialTab = 'quick',
    sectionProps = {},
}) {
    const drawerRef = useRef(null);
    const [tab, setTab] = useState(initialTab);

    useEffect(() => {
        if (open) setTab(initialTab);
    }, [open, initialTab]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const blockBackgroundScroll = (e) => {
            if (drawerRef.current?.contains(e.target)) return;
            e.preventDefault();
        };
        document.addEventListener('wheel', blockBackgroundScroll, { passive: false });
        document.addEventListener('touchmove', blockBackgroundScroll, { passive: false });
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('wheel', blockBackgroundScroll);
            document.removeEventListener('touchmove', blockBackgroundScroll);
        };
    }, [open, onClose]);

    const bulkSelectedCount = sectionProps.bulkSelectedCount ?? 0;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex justify-end overflow-hidden" role="presentation">
            <button
                type="button"
                aria-label="Close filters"
                className="absolute inset-0 bg-cdscrim/70 backdrop-blur-[1px]"
                onClick={onClose}
            />
            <aside
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-label="Activity log filters"
                className={cn(
                    'relative flex flex-col w-full max-w-lg h-full max-h-full min-h-0 overflow-hidden',
                    'bg-cdsurface border-l border-cdborder shadow-2xl',
                    'animate-in slide-in-from-right duration-200',
                    'max-sm:max-w-none max-sm:border-l-0 max-sm:border-t max-sm:mt-auto max-sm:h-[92vh] max-sm:max-h-[92vh] max-sm:rounded-t-xl max-sm:slide-in-from-bottom',
                )}
            >
                <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-cdborder/60 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal size={16} className="text-cdaccent" aria-hidden />
                            <h2 className="text-sm font-bold text-cdtext">Filters</h2>
                            {activeFilterCount > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cdprimarycontainer text-cdonprimarycontainer text-[10px] font-bold tabular-nums">
                                    {activeFilterCount}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[10px] text-cdmuted mt-1">
                            Grouped by purpose — quick chips, metric ranges, and bulk actions.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 rounded p-1.5 text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow cd-focus-ring"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="px-4 py-2 border-b border-cdborder/40 shrink-0">
                    <SegmentedControl
                        size="sm"
                        dense
                        caps={false}
                        value={tab}
                        onChange={setTab}
                        options={FILTER_DRAWER_TABS.map((t) => ({
                            value: t.id,
                            label: t.id === 'bulk' && bulkSelectedCount > 0
                                ? `${t.label} (${bulkSelectedCount})`
                                : t.label,
                        }))}
                        aria-label="Filter drawer sections"
                        className="w-full"
                    />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar touch-pan-y px-4 py-3">
                    {tab === 'quick' ? (
                        <div className="space-y-3">
                            <QuickFilterChips compact={false} {...sectionProps} />
                        </div>
                    ) : null}

                    {tab === 'metrics' ? (
                        <MetricRangesSection
                            expanded
                            drawerLayout
                            onExpandedChange={() => {}}
                            {...sectionProps}
                        />
                    ) : null}

                    {tab === 'bulk' ? (
                        <BulkActionsSection {...sectionProps} layout="drawer" />
                    ) : null}
                </div>

                <footer className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-cdborder/60 bg-cdsurfacelow/50">
                    <button
                        type="button"
                        onClick={sectionProps.onResetLogFilters}
                        className="text-[11px] font-semibold text-cdmuted hover:text-cdaccent cd-focus-ring rounded px-1"
                    >
                        Reset all filters
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-cdprimary text-cdonprimary text-xs font-bold cd-focus-ring"
                    >
                        Show results
                    </button>
                </footer>
            </aside>
        </div>
    );
}
