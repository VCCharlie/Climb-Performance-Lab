import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import NlDateInput from '../NlDateInput';

const FetchIntervalsPanel = ({
    fetchIntervalsDates,
    onFetchIntervalsDatesChange,
    onFetch,
    isFetching,
    isSyncing,
    stravaConnected,
    onOpenImportTab,
}) => (
    <div className="hidden lg:block rounded-lg border border-cdborder bg-cdsurface/80 p-3 space-y-2 mb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
                <h4 className="text-xs font-bold text-cdtext uppercase tracking-wide">Fetch new from Intervals.icu</h4>
                <p className="text-[10px] text-cdmuted leading-snug mt-0.5">
                    Pull activities for the date range below and add or update them in your log.
                    {stravaConnected
                        ? ' With Strava connected: time-window link, same-day fuzzy match (distance/duration), then HR/gear/KOM enrichment and Strava detail refresh — same pipeline as Sync Now for selected rows.'
                        : ' Connect Strava in Settings to auto-link and enrich new rides.'}
                </p>
                <p className="text-[10px] text-cdmuted mt-1">
                    <span className="text-cdaccent font-bold">Tools → Sync Now</span> is different: it only updates{' '}
                    <span className="font-semibold text-cdtext">selected</span> rows (checkboxes) and refreshes Strava details for that selection.
                </p>
            </div>
            <button
                type="button"
                onClick={onOpenImportTab}
                className="shrink-0 text-[10px] font-bold px-2 py-1 rounded border border-cdborder text-cdaccent hover:bg-cdborder/40 self-start sm:self-auto"
            >
                Import tab (CSV / URL)
            </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                <div>
                    <span className="text-[10px] text-cdmuted block mb-0.5">From</span>
                    <NlDateInput
                        value={fetchIntervalsDates.start}
                        onChange={(v) => onFetchIntervalsDatesChange((s) => ({ ...s, start: v }))}
                        className="w-full bg-cdbg border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                        aria-label="Fetch new activities from (dd-mm-jjjj)"
                    />
                </div>
                <div>
                    <span className="text-[10px] text-cdmuted block mb-0.5">To</span>
                    <NlDateInput
                        value={fetchIntervalsDates.end}
                        onChange={(v) => onFetchIntervalsDatesChange((s) => ({ ...s, end: v }))}
                        className="w-full bg-cdbg border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs"
                        aria-label="Fetch new activities to (dd-mm-jjjj)"
                    />
                </div>
            </div>
            <button
                type="button"
                onClick={onFetch}
                disabled={isFetching || isSyncing}
                className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
            >
                {isFetching || isSyncing ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                    <Download size={14} aria-hidden="true" />
                )}
                {isFetching ? 'Fetching…' : 'Fetch & merge'}
            </button>
        </div>
    </div>
);

export default FetchIntervalsPanel;
