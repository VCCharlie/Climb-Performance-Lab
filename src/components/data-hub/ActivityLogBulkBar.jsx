import React from 'react';
import { Edit2, Download, Trash2, X, Loader2 } from 'lucide-react';
import { formatNlNumber } from '../../utils/formatters';

/**
 * Sticky bulk-action bar on mobile when activities are selected.
 */
const ActivityLogBulkBar = ({
    count,
    onBulkEdit,
    onExport,
    onClearSelection,
    onDelete,
    isDeleting = false,
    isBulkSaving = false,
}) => {
    if (!count || count <= 0) return null;

    return (
        <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-[85] pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            role="region"
            aria-label="Bulk actions"
        >
            <div className="pointer-events-auto mx-auto max-w-lg rounded-xl border border-cdborder bg-cdsurface/95 backdrop-blur-md shadow-2xl px-3 py-2.5 flex items-center gap-2">
                <span className="text-xs font-bold text-cdtext tabular-nums shrink-0 min-w-[4.5rem]">
                    {formatNlNumber(count)} sel.
                </span>
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                    <button
                        type="button"
                        onClick={onBulkEdit}
                        disabled={isBulkSaving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cdaccent/50 text-cdaccent text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                        title="Bulk edit selected activities"
                    >
                        {isBulkSaving ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Edit2 size={13} aria-hidden />}
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={onExport}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cdborder text-cdtext text-[11px] font-bold cd-focus-ring"
                        title="Export selected to CSV"
                    >
                        <Download size={13} aria-hidden />
                        CSV
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                        title="Delete selected activities"
                    >
                        {isDeleting ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Trash2 size={13} aria-hidden />}
                    </button>
                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="p-1.5 rounded-lg text-cdmuted hover:text-cdtext cd-focus-ring"
                        aria-label="Clear selection"
                    >
                        <X size={15} aria-hidden />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogBulkBar;
