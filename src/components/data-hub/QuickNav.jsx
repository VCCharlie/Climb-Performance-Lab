import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { MONTH_ORDER } from '../../config';
import { scrollActivityLogToId } from '../../utils/activityLogScroll';
import { cn } from '../ui/cn';

const SCROLL_DELAY_MS = 120;

function scrollToGroupedRow(id) {
    window.requestAnimationFrame(() => {
        window.setTimeout(() => scrollActivityLogToId(id), SCROLL_DELAY_MS);
    });
}

const QuickNav = ({
    groupedActivities,
    isYearExpanded,
    onToggleYear,
    ensureYearExpanded,
    ensureMonthExpanded,
}) => {
    const [openYear, setOpenYear] = useState(null);
    const navRef = useRef(null);

    useEffect(() => {
        if (!openYear) return undefined;
        const onDoc = (e) => {
            if (navRef.current?.contains(e.target)) return;
            setOpenYear(null);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('touchstart', onDoc, { passive: true });
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('touchstart', onDoc);
        };
    }, [openYear]);

    if (!groupedActivities) return null;

    const years = Object.keys(groupedActivities).sort((a, b) => b - a);

    const handleYearSelect = (year) => {
        if (!isYearExpanded(year)) {
            onToggleYear(year);
        } else {
            ensureYearExpanded?.(year);
        }
        scrollToGroupedRow(`year-${year}`);
    };

    const handleMonthSelect = (year, month) => {
        ensureMonthExpanded?.(year, month);
        scrollToGroupedRow(`month-${year}-${month}`);
        setOpenYear(null);
    };

    return (
        <div
            ref={navRef}
            className="flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg border border-cdborder/50 bg-cdsurfacelow/40"
        >
            {years.map((year) => {
                const monthsOpen = openYear === year;
                const yearActive = isYearExpanded(year);
                const months = Object.keys(groupedActivities[year]).sort(
                    (a, b) => MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a),
                );

                return (
                    <div key={year} className="relative">
                        <div
                            className={cn(
                                'flex rounded-md overflow-hidden border text-[10px] font-semibold',
                                yearActive
                                    ? 'border-cdprimary/50 bg-cdprimarycontainer/60'
                                    : 'border-cdborder/60 bg-cdsurface',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => handleYearSelect(year)}
                                className={cn(
                                    'px-2.5 py-1.5 cd-transition cd-focus-ring',
                                    yearActive ? 'text-cdonprimarycontainer' : 'text-cdtext hover:bg-cdborder/30',
                                )}
                            >
                                {year}
                            </button>
                            <button
                                type="button"
                                aria-expanded={monthsOpen}
                                aria-haspopup="menu"
                                aria-label={`Jump to month in ${year}`}
                                onClick={() => setOpenYear((prev) => (prev === year ? null : year))}
                                className={cn(
                                    'px-1.5 border-l border-cdborder/50 cd-focus-ring',
                                    yearActive
                                        ? 'text-cdonprimarycontainer hover:bg-cdprimarycontainer'
                                        : 'text-cdmuted hover:text-cdtext hover:bg-cdborder/30',
                                )}
                            >
                                <ChevronDown
                                    size={12}
                                    className={cn('cd-transition', monthsOpen && 'rotate-180')}
                                    aria-hidden
                                />
                            </button>
                        </div>

                        {monthsOpen && (
                            <div
                                role="menu"
                                className="absolute top-full left-0 mt-1 z-[120] min-w-[8.5rem] max-h-[min(14rem,50vh)] overflow-y-auto custom-scrollbar bg-cdsurface border border-cdborder rounded-lg shadow-lg py-1"
                            >
                                {months.map((month) => (
                                    <button
                                        key={month}
                                        type="button"
                                        role="menuitem"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMonthSelect(year, month);
                                        }}
                                        className="block w-full text-left px-3 py-2 text-[10px] text-cdtext hover:bg-cdborder/40 active:bg-cdborder cd-focus-ring capitalize"
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default QuickNav;
