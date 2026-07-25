
import React, { useState, useEffect, useRef } from 'react';
import { MONTH_ORDER } from '../../config';
import { cn } from '../ui/cn';

const QuickNav = ({ groupedActivities, isYearExpanded, onToggleYear, scrollToId }) => {
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

    const handleScroll = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const toggleMonths = (year) => {
        setOpenYear((prev) => (prev === year ? null : year));
    };

    return (
        <div ref={navRef} className="flex flex-wrap gap-2 mb-4 p-2 bg-cdbg/50 rounded-lg border border-cdborder/50">
            {years.map((year) => {
                const monthsOpen = openYear === year;
                const months = Object.keys(groupedActivities[year]).sort(
                    (a, b) => MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a),
                );

                return (
                    <div key={year} className="flex flex-col relative">
                        <div className="flex rounded overflow-hidden border border-cdborder/60">
                            <button
                                type="button"
                                onClick={() => {
                                    onToggleYear(year);
                                    setTimeout(() => handleScroll(`year-${year}`), 50);
                                }}
                                className={cn(
                                    'px-3 py-2 text-xs font-bold cd-transition cd-focus-ring cd-min-touch-y',
                                    isYearExpanded(year)
                                        ? 'bg-cdaccent text-cdonprimary'
                                        : 'bg-cdsurface text-cdmuted hover:bg-cdborder hover:text-cdtext',
                                )}
                            >
                                {year}
                            </button>
                            <button
                                type="button"
                                aria-expanded={monthsOpen}
                                aria-haspopup="menu"
                                aria-label={`Jump to month in ${year}`}
                                onClick={() => toggleMonths(year)}
                                className="px-2 border-l border-cdborder/60 bg-cdsurface text-cdmuted hover:text-cdtext cd-focus-ring cd-min-touch"
                            >
                                ▾
                            </button>
                        </div>

                        {monthsOpen && (
                            <div
                                role="menu"
                                className="absolute top-full left-0 mt-1 z-[120] min-w-[9rem] max-h-[min(14rem,50vh)] overflow-y-auto custom-scrollbar bg-cdsurface border border-cdborder rounded-lg shadow-xl py-1"
                            >
                                {months.map((month) => (
                                    <button
                                        key={month}
                                        type="button"
                                        role="menuitem"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isYearExpanded(year)) onToggleYear(year);
                                            setTimeout(() => handleScroll(`month-${year}-${month}`), 50);
                                            setOpenYear(null);
                                        }}
                                        className="block w-full text-left px-3 py-2.5 text-xs text-cdtext hover:bg-cdborder/50 active:bg-cdborder cd-focus-ring capitalize cd-min-touch-y"
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
