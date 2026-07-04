import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MONTH_ORDER } from '../../config';
import { cardListShellClass } from '../ui/tableStyles';
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
    visibleColumns,
}) => {
    const cardProps = {
        onDelete,
        onEdit,
        onViewDetail,
        onOpenProfiler,
        profilerClimbByActivityId,
        showBulkSelect,
        visibleColumns,
        profileFtp,
    };

    return (
        <div className={cardListShellClass}>
            {showBulkSelect && (
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
            )}

            <div className="space-y-2">
                {isGroupedView ? (
                    Object.keys(activities)
                        .sort((a, b) => (sortConfig.direction === 'asc' ? a - b : b - a))
                        .map((year) => (
                            <div key={year} id={`year-${year}`} className="space-y-2">
                                <GroupButton
                                    expanded={isYearExpanded(year)}
                                    onClick={() => onToggleYear(year)}
                                    className="px-2 py-2 rounded-lg bg-cdsurfacehigh/80 font-semibold text-cdtext text-sm"
                                >
                                    {year}
                                </GroupButton>

                                {isYearExpanded(year) && Object.keys(activities[year])
                                    .sort((a, b) => {
                                        const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
                                        return sortConfig.direction === 'asc' ? -diff : diff;
                                    })
                                    .map((month) => (
                                        <div key={month} id={`month-${year}-${month}`} className="space-y-2 pl-2">
                                            <GroupButton
                                                expanded={isMonthExpanded(year, month)}
                                                onClick={() => onToggleMonth(year, month)}
                                                className="px-2 py-1.5 text-xs font-semibold text-cdmuted"
                                            >
                                                {month}
                                            </GroupButton>

                                            {isMonthExpanded(year, month) && activities[year][month].map((act) => (
                                                <ActivityCard
                                                    key={act.id}
                                                    act={act}
                                                    isSelected={selectedActivityIds?.has(String(act.id))}
                                                    onToggleSelect={onToggleSelectRow}
                                                    {...cardProps}
                                                />
                                            ))}
                                        </div>
                                    ))}
                            </div>
                        ))
                ) : (
                    activities.map((act) => (
                        <ActivityCard
                            key={act.id}
                            act={act}
                            isSelected={selectedActivityIds?.has(String(act.id))}
                            onToggleSelect={onToggleSelectRow}
                            {...cardProps}
                        />
                    ))
                )}
            </div>
        </div>
    );
});

export default ActivityCardList;
