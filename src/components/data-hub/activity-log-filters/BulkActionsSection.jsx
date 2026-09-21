import React from 'react';
import { Activity, Edit2, GitMerge, Link2, Loader2, Trash } from 'lucide-react';
import { formatNlNumber } from '../../../utils/formatters';
import { buildMarkRecoveryTooltip } from '../../../utils/recoveryTss';
import ActivityLogExportButtons from '../ActivityLogExportButtons';
import { Button } from '../../ui';

/**
 * Bulk actions for Activity Log — grouped rows with consistent Button styling.
 */
export default function BulkActionsSection({
    bulkSelectedCount,
    layout,
    compactBar = false,
    onBulkEdit,
    onBulkSetGravelRide,
    onBulkSetMtbRide,
    onBulkSetEbikeRide,
    onExportCsv,
    onExportXlsx,
    isExportingXlsx,
    onMarkRecovery,
    recoveryTss,
    stravaGetToken,
    onStravaEnrich,
    onStravaDescriptionBackfill,
    onDecouplingBackfill,
    onMergePair,
    canMergePair,
    mergePairHint,
    onDeleteSelected,
    onClearSelection,
    isBulkSaving,
    isStravaEnriching,
    isStravaDescBackfilling,
    isDecouplingBackfilling,
    canDecouplingBackfill,
    isDeleting,
}) {
    if (compactBar) return null;

    const hasSelection = bulkSelectedCount > 0;
    const rootClass = layout === 'drawer'
        ? 'space-y-2'
        : 'border-t border-cdborder/40 px-3 py-2.5 space-y-2';

    return (
        <div className={rootClass}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-cdtext uppercase tracking-wide shrink-0">
                    Bulk
                </span>
                <span className="text-[10px] text-cdmuted tabular-nums">
                    {formatNlNumber(bulkSelectedCount)} selected
                </span>
                {!hasSelection ? (
                    <span className="text-[9px] text-cdmuted hidden sm:inline">
                        · use row checkboxes or header select
                    </span>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
                <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={onBulkEdit}
                    disabled={!hasSelection || isBulkSaving}
                    title="Apply type, gear, load, RPE, or FTP to all selected rows"
                    className="!text-[10px] !h-8"
                >
                    {isBulkSaving ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Edit2 size={12} aria-hidden />}
                    Bulk edit
                </Button>
                <ActivityLogExportButtons
                    disabled={!hasSelection}
                    onExportCsv={onExportCsv}
                    onExportXlsx={onExportXlsx}
                    isExportingXlsx={isExportingXlsx}
                />
                {stravaGetToken ? (
                    <>
                        <Button
                            type="button"
                            variant="outlined"
                            size="sm"
                            onClick={onStravaEnrich}
                            disabled={isStravaEnriching || !hasSelection}
                            title="Auto-link selected rides to Strava, then enrich gear, route, HR, RPE, and segment badges"
                            className="!text-[10px] !h-8"
                        >
                            {isStravaEnriching ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Link2 size={12} aria-hidden />}
                            Strava enrich
                        </Button>
                        <Button
                            type="button"
                            variant="outlined"
                            size="sm"
                            onClick={onStravaDescriptionBackfill}
                            disabled={isStravaDescBackfilling}
                            title="Fetch Strava activity descriptions (MyCols / ClimbFinder)"
                            className="!text-[10px] !h-8"
                        >
                            {isStravaDescBackfilling ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Link2 size={12} aria-hidden />}
                            Descriptions
                        </Button>
                    </>
                ) : null}
                {canDecouplingBackfill ? (
                    <Button
                        type="button"
                        variant="outlined"
                        size="sm"
                        onClick={onDecouplingBackfill}
                        disabled={isDecouplingBackfilling}
                        title="Analyze power+HR streams for steady rides missing within-ride decoupling (selected rows, or next batch)"
                        className="!text-[10px] !h-8"
                    >
                        {isDecouplingBackfilling ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Activity size={12} aria-hidden />}
                        Decoupling
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={onMergePair}
                    disabled={bulkSelectedCount !== 2 || !canMergePair}
                    title={
                        bulkSelectedCount !== 2
                            ? 'Select exactly two duplicate rows to merge'
                            : (mergePairHint || 'Merge two duplicate activities into one row (keeps Strava link, load, gear, and distance)')
                    }
                    className="!text-[10px] !h-8"
                >
                    <GitMerge size={12} aria-hidden />
                    Merge pair
                </Button>
                <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={onMarkRecovery}
                    disabled={!hasSelection}
                    title={buildMarkRecoveryTooltip(recoveryTss)}
                    className="!text-[10px] !h-8"
                >
                    Recovery (TSS {recoveryTss})
                </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
                <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={onBulkSetGravelRide}
                    disabled={!hasSelection || isBulkSaving}
                    title="Set activity type to GravelRide"
                    className="!text-[10px] !h-7"
                >
                    Set Gravel
                </Button>
                <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={onBulkSetMtbRide}
                    disabled={!hasSelection || isBulkSaving}
                    title="Set activity type to MountainBikeRide"
                    className="!text-[10px] !h-7"
                >
                    Set MTB
                </Button>
                <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={onBulkSetEbikeRide}
                    disabled={!hasSelection || isBulkSaving}
                    title="Set activity type to EBikeRide"
                    className="!text-[10px] !h-7"
                >
                    Set E-bike
                </Button>
                <span className="hidden sm:inline w-px h-4 bg-cdborder/60 mx-0.5" aria-hidden />
                <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={onDeleteSelected}
                    disabled={!hasSelection || isDeleting}
                    title="Remove selected activities from the log and cloud"
                    className="!text-[10px] !h-8"
                >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Trash size={12} aria-hidden />}
                    Delete
                </Button>
                <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={onClearSelection}
                    disabled={!hasSelection}
                    className="!text-[10px] !h-7"
                >
                    Clear selection
                </Button>
            </div>
        </div>
    );
}
