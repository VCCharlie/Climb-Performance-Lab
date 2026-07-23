import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import NlDateInput from '../NlDateInput';
import { SPORT_TYPES } from '../../config';
import { Button, Chip } from '../ui';

const IntervalsSyncPanel = ({
    syncDates,
    onSyncDatesChange,
    sportFilters,
    onToggleSportFilter,
    onSetAllSportFilters,
    syncMode,
    onSyncModeChange,
    selectedCount,
    onRunSync,
    isBusy,
    syncProgress,
    stravaConnected,
    stravaEnrichEnabled,
    onStravaEnrichEnabledChange,
    onOpenImportTab,
}) => {
    const isRefreshMode = syncMode === 'refresh-selected';
    const refreshDisabled = isRefreshMode && selectedCount === 0;
    const datesDisabled = isRefreshMode;

    return (
        <div className="rounded-lg border border-cdborder bg-cdsurface/80 p-3 space-y-3 mb-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                    <h4 className="text-xs font-bold text-cdtext uppercase tracking-wide">Intervals.icu sync</h4>
                    <p className="text-[10px] text-cdmuted leading-snug mt-0.5">
                        {isRefreshMode
                            ? `Re-fetch ${selectedCount} selected row(s) from Intervals.icu.`
                            : 'Fetch activities for the date range and add or update them in your log.'}
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

            <div className="flex flex-wrap items-end gap-2">
                <button
                    type="button"
                    onClick={() => onSyncModeChange('fetch-range')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors shrink-0 ${
                        !isRefreshMode
                            ? 'bg-orange-500/20 border-orange-500/50 text-cdtext'
                            : 'border-cdborder text-cdmuted hover:border-cdmuted'
                    }`}
                >
                    Fetch date range
                </button>
                <button
                    type="button"
                    onClick={() => onSyncModeChange('refresh-selected')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors shrink-0 ${
                        isRefreshMode
                            ? 'bg-orange-500/20 border-orange-500/50 text-cdtext'
                            : 'border-cdborder text-cdmuted hover:border-cdmuted'
                    }`}
                >
                    Refresh selected ({selectedCount})
                </button>

                <div className={`flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:max-w-[20rem] ${datesDisabled ? 'opacity-50' : ''}`}>
                    <label className="text-[10px] text-cdmuted shrink-0">From</label>
                    <NlDateInput
                        value={syncDates.start}
                        onChange={(v) => onSyncDatesChange((s) => ({ ...s, start: v }))}
                        disabled={datesDisabled}
                        className="w-full min-w-[6.5rem] bg-cdbg border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs disabled:cursor-not-allowed"
                        aria-label="Sync from (dd-mm-yyyy)"
                    />
                    <label className="text-[10px] text-cdmuted shrink-0">To</label>
                    <NlDateInput
                        value={syncDates.end}
                        onChange={(v) => onSyncDatesChange((s) => ({ ...s, end: v }))}
                        disabled={datesDisabled}
                        className="w-full min-w-[6.5rem] bg-cdbg border border-cdborder rounded px-2 py-1.5 text-cdtext text-xs disabled:cursor-not-allowed"
                        aria-label="Sync to (dd-mm-yyyy)"
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-semibold text-cdmuted uppercase">Sport types</label>
                    <div className="flex gap-2">
                        <Button variant="text" size="sm" type="button" onClick={() => onSetAllSportFilters(true)}>
                            All
                        </Button>
                        <Button variant="text" size="sm" type="button" onClick={() => onSetAllSportFilters(false)}>
                            None
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SPORT_TYPES.map((type) => (
                        <Chip
                            key={type}
                            variant="filter"
                            selected={Boolean(sportFilters[type])}
                            onClick={() => onToggleSportFilter(type)}
                        >
                            {type}
                        </Chip>
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-1 border-t border-cdborder">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <p className="text-[10px] text-cdmuted">
                        {isRefreshMode
                            ? 'Uses the date span of your selected rows. Expand groups first if needed.'
                            : 'Sync in blocks of 2–3 years max to avoid timeouts.'}
                    </p>
                    <label className={`flex items-center gap-2 text-[10px] ${stravaConnected ? 'text-cdtext cursor-pointer' : 'text-cdmuted cursor-not-allowed'}`}>
                        <input
                            type="checkbox"
                            checked={stravaEnrichEnabled}
                            disabled={!stravaConnected}
                            onChange={(e) => onStravaEnrichEnabledChange(e.target.checked)}
                            className="rounded border-cdborder"
                        />
                        <span>
                            Strava link + enrich (gear, HR, segments/KOM)
                            {!stravaConnected ? ' — connect Strava in Settings' : ''}
                        </span>
                    </label>
                </div>
                <Button
                    type="button"
                    onClick={onRunSync}
                    disabled={isBusy || refreshDisabled}
                    loading={isBusy}
                    className="w-full sm:w-auto shrink-0"
                >
                    {!isBusy && (isRefreshMode ? <RefreshCw size={14} aria-hidden="true" /> : <Download size={14} aria-hidden="true" />)}
                    {isBusy
                        ? (syncProgress || 'Syncing…')
                        : (isRefreshMode ? 'Refresh selected' : 'Fetch & merge')}
                </Button>
            </div>
        </div>
    );
};

export default IntervalsSyncPanel;
