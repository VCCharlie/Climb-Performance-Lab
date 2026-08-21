import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cardListShellClass } from '../ui/tableStyles';
import { cn } from '../ui/cn';
import {
    flattenActivityList,
    estimateFlattenedRowSize,
    getFlattenedRowKey,
    shouldVirtualizeActivityList,
} from '../../utils/activityListFlatten';
import ActivityCard from './ActivityCard';

const GroupButton = ({ expanded, onClick, className, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 w-full text-left cd-transition cd-focus-ring rounded-cdsm ${className}`}
    >
        {expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        {children}
    </button>
);

const SelectAllRow = ({ allVisibleSelected, onToggleSelectAllVisible }) => (
    <label className="flex items-center gap-2 px-1 py-1.5 mb-1 text-xs text-cdmuted border-b border-cdborder/40">
        <input
            type="checkbox"
            className="accent-cdprimary w-4 h-4 cursor-pointer"
            checked={allVisibleSelected}
            onChange={onToggleSelectAllVisible}
            aria-label="Select all visible activities"
        />
        <span>Select all visible</span>
    </label>
);

const ActivityCardList = React.memo(({
    activities,
    sortConfig,
    onDelete,
    onEdit,
    onViewDetail,
    isGroupedView,
    isYearExpanded,
    onToggleYear,
    isMonthExpanded,
    onToggleMonth,
    onToggleSelectRow,
    selectedActivityIds,
    onOpenProfiler,
    profilerClimbByActivityId,
    showBulkSelect = false,
    allVisibleSelected = false,
    onToggleSelectAllVisible,
    profileFtp,
    profileMaxHr,
    getStravaToken,
    visibleColumns,
    bulkSelectionActive = false,
}) => {
    const scrollRef = useRef(null);

    const cardProps = {
        onDelete,
        onEdit,
        onViewDetail,
        onOpenProfiler,
        profilerClimbByActivityId,
        showBulkSelect,
        visibleColumns,
        profileFtp,
        profileMaxHr,
        getStravaToken,
    };

    const flatRows = useMemo(
        () => flattenActivityList({
            activities,
            isGroupedView,
            sortConfig,
            isYearExpanded,
            isMonthExpanded,
            includeSelectAll: showBulkSelect,
        }),
        [activities, isGroupedView, sortConfig, isYearExpanded, isMonthExpanded, showBulkSelect],
    );

    const useVirtual = shouldVirtualizeActivityList(flatRows, { layout: 'card' });

    const virtualizer = useVirtualizer({
        count: useVirtual ? flatRows.length : 0,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => estimateFlattenedRowSize(flatRows[index], 'card'),
        overscan: 8,
    });

    const renderRow = (row) => {
        if (row.type === 'selectAll') {
            return (
                <SelectAllRow
                    allVisibleSelected={allVisibleSelected}
                    onToggleSelectAllVisible={onToggleSelectAllVisible}
                />
            );
        }

        if (row.type === 'year') {
            return (
                <GroupButton
                    expanded={isYearExpanded(row.year)}
                    onClick={() => onToggleYear(row.year)}
                    className="px-2 py-2 rounded-lg bg-cdsurfacehigh/80 font-semibold text-cdtext text-sm"
                >
                    {row.year}
                </GroupButton>
            );
        }

        if (row.type === 'month') {
            return (
                <div id={`month-${row.year}-${row.month}`} className="pl-2">
                    <GroupButton
                        expanded={isMonthExpanded(row.year, row.month)}
                        onClick={() => onToggleMonth(row.year, row.month)}
                        className="px-2 py-1.5 text-xs font-semibold text-cdmuted"
                    >
                        {row.month}
                    </GroupButton>
                </div>
            );
        }

        const act = row.act;
        return (
            <ActivityCard
                act={act}
                isSelected={selectedActivityIds?.has(String(act.id))}
                onToggleSelect={onToggleSelectRow}
                {...cardProps}
            />
        );
    };

    return (
        <div
            ref={scrollRef}
            className={cn(cardListShellClass, bulkSelectionActive && 'pb-24')}
        >
            {useVirtual ? (
                <div
                    className="relative w-full"
                    style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const row = flatRows[virtualRow.index];
                        const isActivity = row.type === 'activity';
                        return (
                            <div
                                key={getFlattenedRowKey(row, virtualRow.index)}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                id={row.type === 'year' ? `year-${row.year}` : undefined}
                                className={isActivity ? 'px-0.5' : row.type === 'month' ? 'py-0.5' : 'py-1'}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {renderRow(row)}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    {flatRows.map((row, index) => (
                        <div
                            key={getFlattenedRowKey(row, index)}
                            id={row.type === 'year' ? `year-${row.year}` : row.type === 'month' ? `month-${row.year}-${row.month}` : undefined}
                            className={row.type === 'month' ? 'pl-2' : undefined}
                        >
                            {renderRow(row)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ActivityCardList;
