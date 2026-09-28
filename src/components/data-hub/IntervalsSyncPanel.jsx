import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-react';
import NlDateInput from '../NlDateInput';
import { SPORT_TYPES } from '../../config';
import { Button, Chip, SegmentedControl, inputBaseClass, cn } from '../ui';
import { safeLocalStorageSet } from '../../utils/safeStorage';
import { formatIntervalsSyncHealthLine } from '../../utils/intervalsSyncHealth';
import { SYNC_DEPTH_FAST, SYNC_DEPTH_FULL } from '../../utils/intervalsSyncDepth.js';

const SYNC_PANEL_EXPANDED_KEY = 'cpl.intervalsSyncPanel.expanded.v1';

const SYNC_MODE_OPTIONS = (selectedCount) => [
    { value: 'fetch-range', label: 'Date range' },
    { value: 'refresh-selected', label: `Selected (${selectedCount})` },
];

const SYNC_DEPTH_OPTIONS = [
    { value: SYNC_DEPTH_FAST, label: 'Fast' },
    { value: SYNC_DEPTH_FULL, label: 'Full' },
];

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
    syncDepth,
    onSyncDepthChange,
    onOpenImportTab,
    lastIntervalsSyncAt = null,
    lastSyncHealthSummary = null,
}) => {
    const fromDateId = useId();
    const toDateId = useId();
    const panelId = useId();
    const [expanded, setExpanded] = useState(() => {
        if (typeof localStorage === 'undefined') return true;
        const saved = localStorage.getItem(SYNC_PANEL_EXPANDED_KEY);
        if (saved === 'false') return false;
        return true;
    });

    useEffect(() => {
        safeLocalStorageSet(SYNC_PANEL_EXPANDED_KEY, String(expanded));
    }, [expanded]);

    const syncHealthLine = formatIntervalsSyncHealthLine(lastSyncHealthSummary, lastIntervalsSyncAt);
    const isRefreshMode = syncMode === 'refresh-selected';
    const refreshDisabled = isRefreshMode && selectedCount === 0;
    const datesDisabled = isRefreshMode;

    const subtitle = isRefreshMode
        ? `Re-fetch ${selectedCount} selected row(s) from Intervals.icu.`
        : 'Fetch activities for the date range and add or update them in your log.';

    const dateInputClass = cn(
        inputBaseClass,
        'text-[10px] py-1.5 min-w-0 flex-1 bg-cdsurface border-cdborder/60',
    );

    return (
        <div className="rounded-lg border border-cdborder bg-cdsurface/80 mb-3 shrink-0 min-w-0 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 p-3">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="flex flex-1 min-w-0 items-start justify-between gap-2 text-left hover:bg-cdborder/10 rounded-md -m-1 p-1 transition-colors cd-focus-ring"
                >
                    <div className="min-w-0">
                        <h4 className="cd-type-subsection">Intervals.icu sync</h4>
                        <p className="cd-type-caption mt-0.5">{subtitle}</p>
                        {syncHealthLine ? (
                            <p className="cd-type-caption mt-0.5 text-cdmuted">{syncHealthLine}</p>
                        ) : null}
                    </div>
                    {expanded ? (
                        <ChevronDown size={16} className="text-cdmuted shrink-0 mt-0.5" aria-hidden />
                    ) : (
                        <ChevronRight size={16} className="text-cdmuted shrink-0 mt-0.5" aria-hidden />
                    )}
                </button>
                <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={onOpenImportTab}
                    className="shrink-0 self-start sm:self-auto text-[10px] h-8"
                >
                    Import tab (JSON / URL)
                </Button>
            </div>

            {expanded ? (
                <div id={panelId} className="px-3 pb-3 space-y-2.5 border-t border-cdborder/40 pt-3">
                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-stretch gap-2">
                        <SegmentedControl
                            size="sm"
                            dense
                            caps={false}
                            value={syncMode}
                            onChange={onSyncModeChange}
                            options={SYNC_MODE_OPTIONS(selectedCount)}
                            aria-label="Sync mode"
                            className="w-full md:w-auto shrink-0"
                        />

                        <div
                            className={cn(
                                'flex items-center gap-2 rounded-cdmd border border-cdborder/60 bg-cdsurfacelow p-1.5 min-w-0 flex-1',
                                datesDisabled && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <label htmlFor={fromDateId} className="sr-only">From</label>
                            <NlDateInput
                                id={fromDateId}
                                value={syncDates.start}
                                onChange={(v) => onSyncDatesChange((s) => ({ ...s, start: v }))}
                                disabled={datesDisabled}
                                className={dateInputClass}
                                aria-label="Sync from (dd-mm-yyyy)"
                            />
                            <span className="text-cdmuted text-[10px] shrink-0" aria-hidden>–</span>
                            <label htmlFor={toDateId} className="sr-only">To</label>
                            <NlDateInput
                                id={toDateId}
                                value={syncDates.end}
                                onChange={(v) => onSyncDatesChange((s) => ({ ...s, end: v }))}
                                disabled={datesDisabled}
                                className={dateInputClass}
                                aria-label="Sync to (dd-mm-yyyy)"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-semibold text-cdmuted uppercase">Sport types (cycling on by default)</span>
                            <div className="flex gap-1">
                                <Button variant="text" size="sm" type="button" onClick={() => onSetAllSportFilters(true)}>
                                    All
                                </Button>
                                <Button variant="text" size="sm" type="button" onClick={() => onSetAllSportFilters(false)}>
                                    None
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                            {SPORT_TYPES.map((type) => (
                                <Chip
                                    key={type}
                                    variant="filter"
                                    size="sm"
                                    selected={Boolean(sportFilters[type])}
                                    onClick={() => onToggleSportFilter(type)}
                                >
                                    {type}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1 border-t border-cdborder/60">
                        <div>
                            <span className="text-[10px] font-semibold text-cdmuted uppercase block mb-1">Sync depth</span>
                            <SegmentedControl
                                options={SYNC_DEPTH_OPTIONS}
                                value={syncDepth}
                                onChange={onSyncDepthChange}
                                size="sm"
                                aria-label="Intervals sync depth"
                            />
                            <p className="text-[10px] text-cdmuted mt-1 leading-snug">
                                Fast: Intervals fetch + save only. Full: Strava gap-fill, detail enrich, and HR drift (when enabled below).
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-1 border-t border-cdborder/60">
                        <div className="flex flex-col gap-1 min-w-0">
                            <p className="text-[10px] text-cdmuted leading-snug">
                                {isRefreshMode
                                    ? 'Uses the date span of your selected rows. Expand groups first if needed.'
                                    : 'Sync in blocks of 2–3 years max to avoid timeouts.'}
                            </p>
                            <label className={cn(
                                'flex items-center gap-2 text-[10px]',
                                stravaConnected ? 'text-cdtext cursor-pointer' : 'text-cdmuted cursor-not-allowed',
                            )}
                            >
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
                            variant="filled"
                            size="sm"
                            onClick={onRunSync}
                            disabled={isBusy || refreshDisabled}
                            loading={isBusy}
                            className="w-full sm:w-auto shrink-0"
                        >
                            {!isBusy && (isRefreshMode ? <RefreshCw size={14} aria-hidden /> : <Download size={14} aria-hidden />)}
                            {isBusy
                                ? (syncProgress || 'Syncing…')
                                : (isRefreshMode ? 'Refresh selected' : 'Fetch & merge')}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default IntervalsSyncPanel;
