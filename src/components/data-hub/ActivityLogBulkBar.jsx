import React from 'react';
import { Edit2, Trash2, X, Loader2, Link2, FileText, Activity } from 'lucide-react';
import { formatNlNumber } from '../../utils/formatters';
import ActivityLogExportButtons from './ActivityLogExportButtons';

/**
 * Sticky bulk-action bar on mobile when activities are selected.
 */
const ActivityLogBulkBar = ({
    count,
    useCardLayout = false,
    onBulkEdit,
    onExportCsv,
    onExportXlsx,
    isExportingXlsx = false,
    onClearSelection,
    onDelete,
    onStravaEnrich,
    onStravaDescriptionBackfill,
    onDecouplingBackfill,
    stravaGetToken,
    canDecouplingBackfill = false,
    isDeleting = false,
    isBulkSaving = false,
    isStravaEnriching = false,
    isStravaDescBackfilling = false,
    isDecouplingBackfilling = false,
}) => {
    if (!count || count <= 0 || !useCardLayout) return null;

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[85] pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            role="region"
            aria-label="Bulk actions"
        >
            <div className="pointer-events-auto mx-auto max-w-lg rounded-xl border border-cdborder bg-cdsurface/95 backdrop-blur-md shadow-2xl px-3 py-2.5 flex flex-col gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-cdtext tabular-nums shrink-0 min-w-[4.5rem]">
                        {formatNlNumber(count)} sel.
                    </span>
                    <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0 flex-wrap">
                        {stravaGetToken && (
                            <>
                                <button
                                    type="button"
                                    onClick={onStravaEnrich}
                                    disabled={isStravaEnriching}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 rounded-lg border border-orange-500/40 text-orange-400 text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                                    title="Auto-link and enrich selected rides from Strava"
                                >
                                    {isStravaEnriching ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Link2 size={13} aria-hidden />}
                                    Strava
                                </button>
                                <button
                                    type="button"
                                    onClick={onStravaDescriptionBackfill}
                                    disabled={isStravaDescBackfilling}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 rounded-lg border border-cdborder text-cdmuted text-[11px] font-bold hover:text-cdaccent hover:border-cdaccent/40 disabled:opacity-40 cd-focus-ring"
                                    title="Fetch Strava activity descriptions for selected rides (or next batch if none selected)"
                                >
                                    {isStravaDescBackfilling ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <FileText size={13} aria-hidden />}
                                    Descriptions
                                </button>
                            </>
                        )}
                        {canDecouplingBackfill && (
                            <button
                                type="button"
                                onClick={onDecouplingBackfill}
                                disabled={isDecouplingBackfilling}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 rounded-lg border border-emerald-500/40 text-emerald-400 text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                                title="Backfill within-ride decoupling from power+HR streams"
                            >
                                {isDecouplingBackfilling ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Activity size={13} aria-hidden />}
                                Decouple
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onBulkEdit}
                            disabled={isBulkSaving}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 rounded-lg border border-cdaccent/50 text-cdaccent text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                            title="Bulk edit selected activities"
                        >
                            {isBulkSaving ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Edit2 size={13} aria-hidden />}
                            Edit
                        </button>
                        <ActivityLogExportButtons
                            compact
                            disabled={false}
                            onExportCsv={onExportCsv}
                            onExportXlsx={onExportXlsx}
                            isExportingXlsx={isExportingXlsx}
                        />
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 rounded-lg border border-red-500/40 text-red-400 text-[11px] font-bold disabled:opacity-40 cd-focus-ring"
                            title="Delete selected activities"
                        >
                            {isDeleting ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Trash2 size={13} aria-hidden />}
                        </button>
                        <button
                            type="button"
                            onClick={onClearSelection}
                            className="p-2.5 min-h-11 min-w-11 rounded-lg text-cdmuted hover:text-cdtext cd-focus-ring"
                            aria-label="Clear selection"
                        >
                            <X size={15} aria-hidden />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogBulkBar;
