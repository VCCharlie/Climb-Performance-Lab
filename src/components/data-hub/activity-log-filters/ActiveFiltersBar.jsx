import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../ui';

/**
 * Horizontal bar showing all active filters with one-click remove + clear all.
 */
export default function ActiveFiltersBar({
    pills = [],
    onClearAll,
    className,
}) {
    if (!pills.length) return null;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 px-3 py-2 border-b border-cdborder/40 bg-cdsurface/60',
                className,
            )}
            role="region"
            aria-label="Active filters"
        >
            <span className="text-[9px] font-semibold uppercase tracking-wide text-cdmuted shrink-0">
                Active
            </span>
            <div className="flex flex-1 flex-wrap gap-1.5 min-w-0">
                {pills.map((pill) => (
                    <button
                        key={pill.id}
                        type="button"
                        onClick={pill.onRemove}
                        className="inline-flex items-center gap-1 max-w-[14rem] rounded-full border border-cdaccent/35 bg-cdaccent/10 pl-2 pr-1 py-0.5 text-[10px] text-cdtext hover:bg-cdaccent/20 cd-focus-ring cd-transition"
                        title={`Remove ${pill.label}`}
                    >
                        <span className="truncate">{pill.label}</span>
                        <X size={12} className="shrink-0 text-cdmuted" aria-hidden />
                    </button>
                ))}
            </div>
            {typeof onClearAll === 'function' ? (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[10px] font-semibold text-cdmuted hover:text-cdaccent shrink-0 cd-focus-ring rounded px-1"
                >
                    Clear all
                </button>
            ) : null}
        </div>
    );
}
