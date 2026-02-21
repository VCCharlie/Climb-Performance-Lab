
import React from 'react';
import { MONTH_ORDER } from '../../config';

const QuickNav = ({ groupedActivities, expandedYears, onToggleYear, scrollToId }) => {
    if (!groupedActivities) return null;

    const years = Object.keys(groupedActivities).sort((a, b) => b - a);

    const handleScroll = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-cdbg/50 rounded-lg border border-cdborder/50">
            {years.map(year => (
                <div key={year} className="flex flex-col relative group">
                    <button
                        onClick={() => {
                            onToggleYear(year);
                            // Quick timeout to allow expansion before scrolling
                            setTimeout(() => handleScroll(`year-${year}`), 50);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${expandedYears[year] ? 'bg-yellow-500 text-slate-900' : 'bg-cdsurface text-cdmuted hover:bg-cdborder hover:text-cdtext'}`}
                    >
                        {year}
                    </button>

                    {/* Hover dropdown for months (Desktop) */}
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-50 min-w-[100px] bg-cdsurface border border-cdborder rounded shadow-xl py-1">
                        {Object.keys(groupedActivities[year])
                            .sort((a, b) => MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a))
                            .map(month => (
                                <button
                                    key={month}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!expandedYears[year]) onToggleYear(year);
                                        setTimeout(() => handleScroll(`month-${year}-${month}`), 50);
                                    }}
                                    className="block w-full text-left px-3 py-1.5 text-[10px] text-cdtext hover:bg-cdborder hover:text-yellow-400 capitalize"
                                >
                                    {month}
                                </button>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QuickNav;
