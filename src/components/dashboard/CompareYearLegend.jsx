import React from 'react';
import { compareYearPaletteColor } from '../../utils/compareYearBarColors';

/**
 * Legend for Compare tab year bars — one swatch per year shown.
 */
const CompareYearLegend = ({ years, currentYear }) => {
    const sorted = [...new Set((years || []).map((y) => Number(y)))].filter((y) => Number.isFinite(y));
    sorted.sort((a, b) => b - a);

    if (!sorted.length) return null;

    return (
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-cdmuted">
            <span className="font-bold uppercase tracking-wide shrink-0">Years</span>
            {sorted.map((year) => {
                const color = compareYearPaletteColor(year, sorted);
                const isCurrent = year === currentYear;
                return (
                    <span
                        key={year}
                        className={`inline-flex items-center gap-1.5 ${isCurrent ? 'text-cdtext font-semibold' : ''}`}
                    >
                        <span
                            className="w-3 h-3 rounded-sm border border-cdborder/60 shrink-0"
                            style={{ backgroundColor: color }}
                            aria-hidden
                        />
                        {year}
                        {isCurrent ? <span className="text-cdaccent">(current)</span> : null}
                    </span>
                );
            })}
        </div>
    );
};

export default CompareYearLegend;
