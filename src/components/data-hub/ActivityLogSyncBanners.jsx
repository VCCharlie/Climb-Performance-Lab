import React from 'react';
import { Loader2 } from 'lucide-react';
import { formatNlNumber } from '../../utils/formatters';

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
}) => (
    <>
        {stravaAutoEnrichNotice && (
            <div className="flex items-start justify-between gap-3 text-xs px-3 py-2 rounded-lg mb-3 border bg-amber-500/5 border-amber-500/20 text-amber-100/90">
                <span className="leading-snug">{stravaAutoEnrichNotice}</span>
                <button
                    type="button"
                    onClick={onDismissStravaAutoEnrichNotice}
                    className="shrink-0 text-[10px] text-amber-200/70 hover:text-amber-100 underline"
                >
                    Dismiss
                </button>
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
            <div className={`flex flex-col gap-1 text-xs px-3 py-2 rounded-lg mb-3 border ${isStravaEnriching ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-cdbg/80 border-cdborder text-cdmuted'}`}>
                <span className="flex items-center gap-2 font-bold text-cdtext">
                    {isStravaEnriching && <Loader2 size={14} className="animate-spin text-amber-400" />}
                    Strava enrich
                </span>
                <span className="text-[11px] leading-snug">{stravaEnrichMsg}</span>
                {!isStravaEnriching && stravaEnrichMsg && (
                    <button
                        type="button"
                        onClick={onDismissStravaEnrichMsg}
                        className="self-end text-[10px] text-cdmuted hover:text-cdtext underline"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        )}
        {(isStravaDescBackfilling || stravaDescBackfillMsg) && (
            <div className={`flex flex-col gap-1 text-xs px-3 py-2 rounded-lg mb-3 border ${isStravaDescBackfilling ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-cdbg/80 border-cdborder text-cdmuted'}`}>
                <span className="flex items-center gap-2 font-bold text-cdtext">
                    {isStravaDescBackfilling && <Loader2 size={14} className="animate-spin text-blue-400" />}
                    Strava descriptions
                </span>
                <span className="text-[11px] leading-snug">{stravaDescBackfillMsg}</span>
                {!isStravaDescBackfilling && stravaDescBackfillMsg && (
                    <button
                        type="button"
                        onClick={onDismissStravaDescBackfillMsg}
                        className="self-end text-[10px] text-cdmuted hover:text-cdtext underline"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        )}
    </>
);

export default ActivityLogSyncBanners;
