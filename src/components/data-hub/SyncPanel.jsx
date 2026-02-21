
import React from 'react';
import {
    RefreshCw, CheckCircle
} from 'lucide-react';
import { SPORT_TYPES } from '../../config';

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
        <div className="bg-cdbg/50 border border-cdborder rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-bold text-cdtext flex items-center gap-2"><RefreshCw size={20} className="text-orange-400" /> Sync Activities</h3>
            <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-xs text-blue-200 mb-4">
                <strong>Tip:</strong> Sync in blokken van max 2-3 jaar om time-outs te voorkomen (bijv. 2014-2016, dan 2017-2019).
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-cdmuted block mb-1">From</span><input type="date" value={syncDates.start} onChange={e => setSyncDates(s => ({ ...s, start: e.target.value }))} className="w-full bg-cdsurface border border-cdborder rounded p-2 text-cdtext text-sm" /></div>
                <div><span className="text-xs text-cdmuted block mb-1">To</span><input type="date" value={syncDates.end} onChange={e => setSyncDates(s => ({ ...s, end: e.target.value }))} className="w-full bg-cdsurface border border-cdborder rounded p-2 text-cdtext text-sm" /></div>
            </div>
            <div>
                <div className="flex justify-between mb-2"><label className="text-xs uppercase font-bold text-cdmuted">Types</label><div className="space-x-2"><button onClick={() => setAllSportFilters(true)} className="text-[10px] text-blue-400">All</button><button onClick={() => setAllSportFilters(false)} className="text-[10px] text-blue-400">None</button></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SPORT_TYPES.map(type => (
                        <label key={type} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border ${sportFilters[type] ? 'bg-orange-500/20 border-orange-500/50 text-cdtext' : 'bg-cdsurface border-cdborder text-cdmuted'}`}>
                            <input type="checkbox" checked={sportFilters[type] || false} onChange={() => toggleSportFilter(type)} className="hidden" />
                            {sportFilters[type] && <CheckCircle size={12} className="text-orange-400" />} {type}
                        </label>
                    ))}
                </div>
            </div>
            <div className="pt-4 border-t border-cdborder">
                <button id="sync-btn" onClick={handleIntervalsSync} disabled={isSyncing} className="w-full py-3 rounded bg-orange-500 hover:bg-orange-600 text-cdtext font-bold transition-all shadow-lg shadow-orange-500/20">
                    {isSyncing ? (syncProgress || 'Syncing...') : 'Sync Now'}
                </button>
            </div>
        </div>
    );
};

export default SyncPanel;
