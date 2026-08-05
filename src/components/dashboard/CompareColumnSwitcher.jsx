import React from 'react';

/**
 * On narrow viewports, toggles between column 1 and column 2 instead of stacking both tables.
 */
export default function CompareColumnSwitcher({ activeColumn, onChange, showCompare }) {
    if (!showCompare) return null;

    return (
        <div className="lg:hidden flex rounded-lg border border-cdborder overflow-hidden text-xs font-bold">
            <button
                type="button"
                onClick={() => onChange(1)}
                className={`flex-1 px-3 py-2 transition-colors ${
                    activeColumn === 1
                        ? 'bg-cdaccent/15 text-cdaccent'
                        : 'bg-cdborder/20 text-cdmuted hover:text-cdtext'
                }`}
                aria-pressed={activeColumn === 1}
            >
                Column 1
            </button>
            <button
                type="button"
                onClick={() => onChange(2)}
                className={`flex-1 px-3 py-2 transition-colors border-l border-cdborder ${
                    activeColumn === 2
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-cdborder/20 text-cdmuted hover:text-cdtext'
                }`}
                aria-pressed={activeColumn === 2}
            >
                Column 2
            </button>
        </div>
    );
}
