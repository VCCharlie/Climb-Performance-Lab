import React from 'react';
import NlDateInput from '../NlDateInput';
import { RefreshCw } from 'lucide-react';
import { SPORT_TYPES } from '../../config';
import { Button, Card, Chip, inputBaseClass } from '../ui';

const SyncPanel = ({
    syncDates,
    setSyncDates,
    sportFilters,
    toggleSportFilter,
    setAllSportFilters,
    isSyncing,
    syncProgress,
    handleIntervalsSync
}) => {
    return (
        <Card variant="filled" className="space-y-6">
            <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                <RefreshCw size={20} className="text-cdprimary" />
                Sync Activities
            </h3>
            <div className="bg-cdblue/10 border border-cdblue/25 p-3 rounded-cdmd text-xs text-cdtext">
                <strong>Tip:</strong> Sync in blocks of 2–3 years max to avoid timeouts (e.g. 2014–2016, then 2017–2019).
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-xs text-cdmuted block mb-1">From</span>
                    <NlDateInput
                        value={syncDates.start}
                        onChange={(v) => setSyncDates((s) => ({ ...s, start: v }))}
                        className={inputBaseClass}
                        aria-label="Sync from (dd/mm/yyyy)"
                    />
                </div>
                <div>
                    <span className="text-xs text-cdmuted block mb-1">To</span>
                    <NlDateInput
                        value={syncDates.end}
                        onChange={(v) => setSyncDates((s) => ({ ...s, end: v }))}
                        className={inputBaseClass}
                        aria-label="Sync to (dd/mm/yyyy)"
                    />
                </div>
            </div>
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-semibold text-cdmuted">Sport types</label>
                    <div className="flex gap-2">
                        <Button variant="text" size="sm" type="button" onClick={() => setAllSportFilters(true)}>
                            All
                        </Button>
                        <Button variant="text" size="sm" type="button" onClick={() => setAllSportFilters(false)}>
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
                            onClick={() => toggleSportFilter(type)}
                        >
                            {type}
                        </Chip>
                    ))}
                </div>
            </div>
            <div className="pt-4 border-t border-cdborder">
                <Button
                    id="sync-btn"
                    onClick={handleIntervalsSync}
                    disabled={isSyncing}
                    loading={isSyncing}
                    fullWidth
                    size="lg"
                >
                    {isSyncing ? (syncProgress || 'Syncing...') : 'Sync Now'}
                </Button>
            </div>
        </Card>
    );
};

export default SyncPanel;
