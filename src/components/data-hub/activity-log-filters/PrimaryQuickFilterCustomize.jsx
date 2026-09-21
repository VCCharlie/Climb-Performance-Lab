import React, { useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import AnchoredDropdownPortal from '../../ui/AnchoredDropdownPortal';
import { cn } from '../../ui';
import {
    ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS,
    QUICK_FILTER_GROUP_LABELS,
} from '../../../utils/activityLogQuickFilterDefinitions';
import {
    MAX_PRIMARY_QUICK_FILTERS,
    MIN_PRIMARY_QUICK_FILTERS,
} from '../../../utils/activityLogPrimaryQuickFilters';

/**
 * Popover to choose which quick filters stay pinned on the compact bar.
 */
export default function PrimaryQuickFilterCustomize({
    selectedIds,
    onToggleFilter,
    onResetDefaults,
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);

    const selectedSet = new Set(selectedIds);
    const atMax = selectedIds.length >= MAX_PRIMARY_QUICK_FILTERS;

    const groups = Object.keys(QUICK_FILTER_GROUP_LABELS);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1 shrink-0 rounded-full border border-cdborder/80 bg-cdsurface px-2 py-0.5 min-h-[22px] text-[9px] font-semibold text-cdmuted hover:text-cdtext hover:border-cdaccent/40 cd-focus-ring cd-transition"
                title="Choose which filters stay visible on the bar"
            >
                <Settings2 size={11} aria-hidden />
                Customize
            </button>
            <AnchoredDropdownPortal
                open={open}
                anchorRef={buttonRef}
                onClose={() => setOpen(false)}
                minWidth={260}
            >
                <div className="p-3 space-y-3" role="dialog" aria-label="Customize filter bar">
                    <div>
                        <p className="text-xs font-bold text-cdtext">Filter bar shortcuts</p>
                        <p className="text-[10px] text-cdmuted mt-1 leading-snug">
                            Pick up to {MAX_PRIMARY_QUICK_FILTERS} filters to keep on the bar.
                            On wide screens, popular extras may appear until you replace them here.
                        </p>
                    </div>

                    {groups.map((groupKey) => {
                        const items = ACTIVITY_LOG_QUICK_FILTER_DEFINITIONS.filter((d) => d.group === groupKey);
                        if (!items.length) return null;
                        return (
                            <div key={groupKey}>
                                <p className="text-[9px] font-semibold uppercase text-cdmuted mb-1.5">
                                    {QUICK_FILTER_GROUP_LABELS[groupKey]}
                                </p>
                                <ul className="space-y-1">
                                    {items.map((item) => {
                                        const checked = selectedSet.has(item.id);
                                        const disableUncheck = checked && selectedIds.length <= MIN_PRIMARY_QUICK_FILTERS;
                                        const disableCheck = !checked && atMax;
                                        return (
                                            <li key={item.id}>
                                                <label
                                                    className={cn(
                                                        'flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] text-cdtext',
                                                        (disableUncheck || disableCheck)
                                                            ? 'opacity-60 cursor-not-allowed'
                                                            : 'hover:bg-cdsurfacelow cursor-pointer',
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 accent-cdprimary"
                                                        checked={checked}
                                                        disabled={disableUncheck || disableCheck}
                                                        onChange={(e) => onToggleFilter(item.id, e.target.checked)}
                                                    />
                                                    <span>
                                                        <span className="font-medium">{item.label}</span>
                                                        {item.title ? (
                                                            <span className="block text-[10px] text-cdmuted font-normal">
                                                                {item.title}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-cdborder/40">
                        <span className="text-[10px] text-cdmuted tabular-nums">
                            {selectedIds.length}/{MAX_PRIMARY_QUICK_FILTERS} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                onResetDefaults?.();
                                setOpen(false);
                            }}
                            className="text-[10px] font-semibold text-cdaccent hover:underline cd-focus-ring rounded px-1"
                        >
                            Reset defaults
                        </button>
                    </div>
                </div>
            </AnchoredDropdownPortal>
        </>
    );
}
