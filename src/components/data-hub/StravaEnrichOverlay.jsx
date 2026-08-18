import React from 'react';
import StravaEnrichTab from './StravaEnrichTab';

/**
 * Full-screen Strava link/enrich overlay from DataHub.
 */
export default function StravaEnrichOverlay({
    open,
    stravaGetToken,
    onClose,
    activities,
    onImportNew,
    onAfterStravaLink,
    startDate,
    endDate,
    persistedResults,
    onResultsChange,
    enrichmentTarget,
}) {
    if (!open || !stravaGetToken) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-cdbg/80 backdrop-blur-sm">
            <button
                type="button"
                aria-label="Close Strava enrichment"
                className="absolute inset-0 cursor-default"
                onClick={onClose}
            />
            <div className="relative w-full sm:max-w-3xl max-h-[min(92vh,900px)] sm:rounded-xl border border-cdborder bg-cdsurface shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-cdborder bg-cdbg/80 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-orange-400 shrink-0"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-cdtext truncate">Link to Strava</h2>
                            <p className="text-[10px] text-cdmuted truncate">Manual link for one activity · bulk auto-link: select rows → Strava enrich</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext hover:border-cdprimary/50 transition-colors cd-focus-ring"
                    >
                        Close
                    </button>
                </div>
                <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <StravaEnrichTab
                        activities={activities}
                        getStravaToken={stravaGetToken}
                        onImportNew={onImportNew}
                        onAfterStravaLink={onAfterStravaLink}
                        startDate={startDate}
                        endDate={endDate}
                        persistedResults={persistedResults}
                        onResultsChange={onResultsChange}
                        enrichmentTarget={enrichmentTarget}
                        dateRangeHint="Set the date range in the header (dashboard period)."
                    />
                </div>
            </div>
        </div>
    );
}
