import React from 'react';
import { AlertCircle, Loader2, RefreshCw, X } from 'lucide-react';

/**
 * Pending Strava enrich retries (429 / partial) — shown inside Link to Strava overlay.
 */
export default function StravaEnrichPendingPanel({
    pendingEntries = [],
    isRetrying = false,
    retryMessage = null,
    onRetryAll,
    onDismissEntry,
    onClearAll,
}) {
    if (!pendingEntries.length && !retryMessage) return null;

    return (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 space-y-2">
            <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-cdtext">Pending Strava enrich</p>
                    <p className="text-[11px] text-cdmuted mt-0.5">
                        These rides were not fully updated (often Strava rate limit 429). Wait ~15 minutes, then retry.
                    </p>
                    {retryMessage && (
                        <p className="text-[11px] text-cdtext mt-1">{retryMessage}</p>
                    )}
                </div>
                {pendingEntries.length > 0 && (
                    <button
                        type="button"
                        onClick={onRetryAll}
                        disabled={isRetrying}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded border border-amber-500/50 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 cd-focus-ring"
                    >
                        {isRetrying ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <RefreshCw size={12} aria-hidden />}
                        Retry all
                    </button>
                )}
            </div>
            {pendingEntries.length > 0 && (
                <ul className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                    {pendingEntries.map((entry) => (
                        <li
                            key={entry.activityId}
                            className="flex items-center gap-2 text-[11px] rounded border border-cdborder/40 bg-cdsurface/80 px-2 py-1.5"
                        >
                            <span className="text-cdmuted shrink-0 w-[4.5rem] tabular-nums">{entry.date || '—'}</span>
                            <span className="flex-1 truncate text-cdtext" title={entry.title}>{entry.title}</span>
                            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                {entry.reason === 'rate_limit' ? '429' : entry.reason === 'failed' ? 'Failed' : 'Partial'}
                            </span>
                            <button
                                type="button"
                                aria-label={`Remove ${entry.title} from pending enrich queue`}
                                onClick={() => onDismissEntry?.(entry.activityId)}
                                className="p-0.5 text-cdmuted hover:text-cdtext cd-focus-ring rounded"
                            >
                                <X size={12} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {pendingEntries.length > 0 && onClearAll && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[10px] text-cdmuted hover:text-cdtext underline cd-focus-ring"
                >
                    Clear pending list
                </button>
            )}
        </div>
    );
}
