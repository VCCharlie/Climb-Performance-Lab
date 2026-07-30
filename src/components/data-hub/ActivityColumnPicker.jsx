import React, { useState, useRef, useEffect } from 'react';
import { Columns2, ChevronDown } from 'lucide-react';
import {
    ACTIVITY_TABLE_COLUMNS,
    ACTIVITY_COLUMN_PRESET_LABELS,
} from '../../config';
import { cn } from '../ui/cn';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';

const PRESET_ORDER = ['essential', 'power', 'full'];

/**
 * Column visibility picker for the Activity Log table.
 * Uses a portal so the menu is not clipped by the mobile filter bar scroll area.
 */
const ActivityColumnPicker = ({
    visibleKeys,
    activePreset,
    applyPreset,
    toggleColumn,
    isColumnVisible,
    className = '',
}) => {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (buttonRef.current?.contains(e.target)) return;
            if (e.target.closest?.('[data-anchored-dropdown]')) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const presetLabel = activePreset === 'custom'
        ? 'Custom'
        : (ACTIVITY_COLUMN_PRESET_LABELS[activePreset] || 'Columns');

    return (
        <div className={cn('relative shrink-0', className)}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label="Choose visible columns"
                title="Show or hide table columns"
                className="flex items-center justify-center gap-1.5 h-9 px-3 rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-cdaccent/60 cd-transition focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
            >
                <Columns2 size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{presetLabel}</span>
                <ChevronDown
                    size={14}
                    className={`text-cdmuted cd-transition ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <AnchoredDropdownPortal
                open={open}
                anchorRef={buttonRef}
                onClose={() => setOpen(false)}
                minWidth={288}
                className="max-w-[calc(100vw-1rem)]"
            >
                <div role="dialog" aria-label="Column visibility">
                    <div className="px-3 py-2 border-b border-cdborder/60 bg-cdsurfacelow">
                        <p className="text-xs font-semibold text-cdtext">Table columns</p>
                        <p className="text-[10px] text-cdmuted mt-0.5">
                            Presets or pick columns individually. {visibleKeys.length} of {ACTIVITY_TABLE_COLUMNS.length} visible.
                        </p>
                    </div>

                    <div className="px-3 py-2 border-b border-cdborder/40 flex flex-wrap gap-1.5">
                        {PRESET_ORDER.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => applyPreset(id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border cd-transition focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none ${
                                    activePreset === id
                                        ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
                                        : 'border-cdborder text-cdmuted hover:text-cdtext'
                                }`}
                            >
                                {ACTIVITY_COLUMN_PRESET_LABELS[id]}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-[min(14rem,50vh)] overflow-y-auto custom-scrollbar px-3 py-2 space-y-1">
                        {ACTIVITY_TABLE_COLUMNS.map((col) => {
                            const checked = isColumnVisible(col.key);
                            const isLastVisible = checked && visibleKeys.length === 1;
                            return (
                                <label
                                    key={col.key}
                                    className={`flex items-center gap-2 py-1 text-xs rounded px-1 cd-transition ${
                                        isLastVisible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-cdborder/30'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="accent-cdprimary w-3.5 h-3.5 shrink-0"
                                        checked={checked}
                                        disabled={isLastVisible}
                                        onChange={() => toggleColumn(col.key)}
                                    />
                                    <span className="text-cdtext">{col.pickerLabel || col.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </AnchoredDropdownPortal>
        </div>
    );
};

export default ActivityColumnPicker;
