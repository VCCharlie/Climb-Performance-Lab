import React from 'react';
import { Loader2 } from 'lucide-react';
import { formatNlNumber } from '../../utils/formatters';

function mentionsStravaPendingQueue(text) {
    return typeof text === 'string' && /pending enrich/i.test(text);
}

function StravaPendingQueueActions({
    showOpenLink,
    onOpenStravaPendingQueue,
    onDismiss,
    dismissClassName,
}) {
    if (!showOpenLink && !onDismiss) return null;
    return (
        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
            {showOpenLink && onOpenStravaPendingQueue ? (
                <button
                    type="button"
                    onClick={onOpenStravaPendingQueue}
                    className="text-xs font-bold text-cdaccent hover:underline underline-offset-2 cd-focus-ring rounded"
                >
                    Open pending queue
                </button>
            ) : null}
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    className={dismissClassName}
                >
                    Dismiss
                </button>
            ) : null}
        </div>
    );
}

const ActivityLogSyncBanners = ({
    syncStatus,
    syncErrorDetail,
    isSyncing,
    syncProgress,
    stravaListProgress,
    isStravaEnriching,
    stravaEnrichMsg,
    onDismissStravaEnrichMsg,
    stravaAutoEnrichNotice,
    onDismissStravaAutoEnrichNotice,
    isStravaDescBackfilling,
    stravaDescBackfillMsg,
    onDismissStravaDescBackfillMsg,
    isDecouplingBackfilling,
    decouplingBackfillMsg,
    onDismissDecouplingBackfillMsg,
    stravaEnrichPendingCount = 0,
    onOpenStravaPendingQueue,
}) => {
    const showPendingQueueLink = Boolean(
        onOpenStravaPendingQueue
        && (
            stravaEnrichPendingCount > 0
            || mentionsStravaPendingQueue(stravaAutoEnrichNotice)
            || mentionsStravaPendingQueue(stravaEnrichMsg)
        ),
    );
    const autoNoticeTitle = stravaAutoEnrichNotice && /429|rate limit/i.test(stravaAutoEnrichNotice)
        ? 'Strava rate limit'
        : 'Strava enrich';

    return (
    <>
        {stravaAutoEnrichNotice && (
            <div
                role="status"
                className="flex items-start justify-between gap-3 text-sm px-3 py-2.5 rounded-lg mb-3 border bg-amber-500/15 border-amber-600/40 text-cdtext"
            >
                <p className="leading-snug min-w-0 text-cdtext">
                    <span className="font-semibold text-amber-900 dark:text-amber-100">{autoNoticeTitle}</span>
                    {' — '}
                    {stravaAutoEnrichNotice}
                </p>
                <StravaPendingQueueActions
                    showOpenLink={showPendingQueueLink}
                    onOpenStravaPendingQueue={onOpenStravaPendingQueue}
                    onDismiss={onDismissStravaAutoEnrichNotice}
                    dismissClassName="shrink-0 text-xs font-bold text-amber-900 dark:text-amber-100 underline underline-offset-2 hover:opacity-80"
                />
            </div>
        )}
        {syncStatus && (
            <div
                className={`flex flex-col gap-1 text-xs font-bold px-3 py-2 rounded-lg mb-3 ${
                    syncStatus === 'success' || syncStatus === 'done' || syncStatus === 'enriching' || syncStatus === 'started'
                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
            >
                <span className="flex items-center gap-2">
                    {(syncStatus === 'started' || syncStatus === 'enriching' || isSyncing) && <Loader2 size={14} className="animate-spin" />}
                    {syncStatus === 'done' && '✅ '}
                    {syncStatus === 'error' && '❌ '}
                    {isSyncing ? (syncProgress || 'Syncing...') : syncErrorDetail}
                </span>
                {stravaListProgress && (
                    <span className="text-[10px] font-normal text-cdmuted">
                        Strava list: page {stravaListProgress.page} · ~{formatNlNumber(stravaListProgress.bikeCount)} bike activities loaded so far…
                    </span>
                )}
            </div>
        )}
        {(isStravaEnriching || stravaEnrichMsg) && (
            <div
                role="status"
                className={`flex flex-col gap-1.5 text-sm px-3 py-2.5 rounded-lg mb-3 border ${
                    isStravaEnriching
                        ? 'bg-amber-500/15 border-amber-600/40 text-cdtext'
                        : 'bg-cdsurface border-cdborder text-cdtext'
                }`}
            >
                <span className="flex items-center gap-2 font-semibold text-cdtext">
                    {isStravaEnriching && <Loader2 size={14} className="animate-spin text-amber-600 dark:text-amber-400" />}
                    Strava enrich
                </span>
                <span className="text-sm leading-snug text-cdtext">{stravaEnrichMsg}</span>
                {!isStravaEnriching && stravaEnrichMsg && (
                    <StravaPendingQueueActions
                        showOpenLink={showPendingQueueLink}
                        onOpenStravaPendingQueue={onOpenStravaPendingQueue}
                        onDismiss={onDismissStravaEnrichMsg}
                        dismissClassName="text-xs font-bold text-cdaccent hover:underline underline-offset-2"
                    />
                )}
            </div>
        )}
        {(isStravaDescBackfilling || stravaDescBackfillMsg) && (
            <div
                role="status"
                className={`flex flex-col gap-1.5 text-sm px-3 py-2.5 rounded-lg mb-3 border ${
                    isStravaDescBackfilling
                        ? 'bg-blue-500/15 border-blue-600/40 text-cdtext'
                        : 'bg-cdsurface border-cdborder text-cdtext'
                }`}
            >
                <span className="flex items-center gap-2 font-semibold text-cdtext">
                    {isStravaDescBackfilling && <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />}
                    Strava descriptions
                </span>
                <span className="text-sm leading-snug text-cdtext">{stravaDescBackfillMsg}</span>
                {!isStravaDescBackfilling && stravaDescBackfillMsg && (
                    <button
                        type="button"
                        onClick={onDismissStravaDescBackfillMsg}
                        className="self-end text-xs font-bold text-cdaccent hover:underline underline-offset-2"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        )}
        {(isDecouplingBackfilling || decouplingBackfillMsg) && (
            <div
                role="status"
                className={`flex flex-col gap-1.5 text-sm px-3 py-2.5 rounded-lg mb-3 border ${
                    isDecouplingBackfilling
                        ? 'bg-emerald-500/15 border-emerald-600/40 text-cdtext'
                        : 'bg-cdsurface border-cdborder text-cdtext'
                }`}
            >
                <span className="flex items-center gap-2 font-semibold text-cdtext">
                    {isDecouplingBackfilling && <Loader2 size={14} className="animate-spin text-emerald-600 dark:text-emerald-400" />}
                    Aerobic decoupling backfill
                </span>
                <span className="text-sm leading-snug text-cdtext">{decouplingBackfillMsg}</span>
                {!isDecouplingBackfilling && decouplingBackfillMsg && (
                    <button
                        type="button"
                        onClick={onDismissDecouplingBackfillMsg}
                        className="self-end text-xs font-bold text-cdaccent hover:underline underline-offset-2"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        )}
    </>
    );
};

export default ActivityLogSyncBanners;
