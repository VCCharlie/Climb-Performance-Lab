import React, { useState } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { SPORT_TYPES } from '../../config';
import useIntervalsSync from '../../hooks/useIntervalsSync';

const SyncTab = ({ intervalsConfig, existingActivities, onSyncResults }) => {
    const [syncDates, setSyncDates] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [sportFilters, setSportFilters] = useState(
        SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
    );

    const { syncActivities, isSyncing } = useIntervalsSync(intervalsConfig);

    const toggleSportFilter = (type) => setSportFilters(prev => ({ ...prev, [type]: !prev[type] }));
    const setAllSportFilters = (val) => setSportFilters(SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: val }), {}));

    const handleSync = async () => {
        try {
            const { count, newActivities } = await syncActivities(syncDates.start, syncDates.end, sportFilters, existingActivities);
            if (count > 0) {
                onSyncResults(newActivities);
            } else {
                // Determine if it was empty result or just duplicates
                // For now, the hook returns 0 count for both cases, but we can improve valid alerting if needed.
                // Re-using the logic from original component:
                // "Geen activiteiten gevonden..." vs "Je bent helemaal bij!"
                // The hook logic I wrote combines this slightly, but let's stick to standard behavior:
                if (newActivities.length === 0) {
                    alert("Je bent helemaal bij! Alle gevonden ritten staan al in je dashboard (of er waren er geen).");
                }
            }
        } catch (e) {
            alert("Sync Fout: " + e.message);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><RefreshCw size={20} className="text-orange-400" /> Sync Activities</h3>
            <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-slate-400 block mb-1">From</span><input type="date" value={syncDates.start} onChange={e => setSyncDates(s => ({ ...s, start: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" /></div>
                <div><span className="text-xs text-slate-400 block mb-1">To</span><input type="date" value={syncDates.end} onChange={e => setSyncDates(s => ({ ...s, end: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" /></div>
            </div>
            <div>
                <div className="flex justify-between mb-2"><label className="text-xs uppercase font-bold text-slate-500">Types</label><div className="space-x-2"><button onClick={() => setAllSportFilters(true)} className="text-[10px] text-blue-400">All</button><button onClick={() => setAllSportFilters(false)} className="text-[10px] text-blue-400">None</button></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SPORT_TYPES.map(type => (
                        <label key={type} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border ${sportFilters[type] ? 'bg-orange-500/20 border-orange-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <input type="checkbox" checked={sportFilters[type] || false} onChange={() => toggleSportFilter(type)} className="hidden" />
                            {sportFilters[type] && <CheckCircle size={12} className="text-orange-400" />} {type}
                        </label>
                    ))}
                </div>
            </div>
            <div className="pt-4 border-t border-slate-700">
                <button onClick={handleSync} disabled={isSyncing} className="w-full py-3 rounded bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg shadow-orange-500/20">{isSyncing ? 'Syncing...' : 'Sync Now'}</button>
            </div>
        </div>
    );
};

export default SyncTab;
