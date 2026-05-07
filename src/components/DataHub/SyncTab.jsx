import React, { useState } from 'react';
import { RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { SPORT_TYPES } from '../../config';
import useIntervalsSync from '../../hooks/useIntervalsSync';
import NlDateInput from '../NlDateInput';

// Let op: we hebben getStravaToken hier als prop toegevoegd!
const SyncTab = ({ intervalsConfig, existingActivities, onSyncResults, getStravaToken }) => {
    const [syncDates, setSyncDates] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [sportFilters, setSportFilters] = useState(
        SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
    );

    const { syncIntervals, isSyncing } = useIntervalsSync(intervalsConfig);

    // Nieuwe state om aan te geven dat we Strava data aan het toevoegen zijn
    const [isEnriching, setIsEnriching] = useState(false);

    const toggleSportFilter = (type) => setSportFilters(prev => ({ ...prev, [type]: !prev[type] }));
    const setAllSportFilters = (val) => setSportFilters(SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: val }), {}));

    const handleSync = async () => {
        // Validatie: als dates leeg zijn, stop dan
        if (!syncDates.start || !syncDates.end) {
            alert("Select a valid start and end date.");
            return;
        }

        try {
            // STAP 1: Basisdata ophalen (Source of Truth)
            const newActivities = await syncIntervals(syncDates.start, syncDates.end, sportFilters, existingActivities);

            // Bepaal welke bestaande ritten nog geen Strava koppeling hebben
            const existingWithoutStrava = (existingActivities || []).filter(act => {
                const actDate = act.date?.split('T')[0];
                return !act.strava_id && actDate >= syncDates.start && actDate <= syncDates.end;
            });

            if ((!newActivities || newActivities.length === 0) && existingWithoutStrava.length === 0) {
                alert("You are up to date. All rides in range are already in your log and enriched.");
                return;
            }

            // STAP 2: Automatische Strava Verrijking (Match & Merge)
            let enrichedNewActivities = newActivities ? [...newActivities] : [];
            const totalToEnrich = [...enrichedNewActivities, ...existingWithoutStrava];

            // Als we een Strava token hebben, proberen we de ritten direct te verrijken
            if (getStravaToken && totalToEnrich.length > 0) {
                setIsEnriching(true);
                try {
                    const token = await getStravaToken();
                    if (token) {
                        const afterTs = Math.floor(new Date(syncDates.start).getTime() / 1000);
                        // + 86400 om de hele laatste dag mee te nemen
                        const beforeTs = Math.floor(new Date(syncDates.end).getTime() / 1000) + 86400;

                        const resp = await fetch(
                            `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        if (resp.ok) {
                            const stravaActivities = await resp.json();

                            // Match logica toepassen op de nieuwe ritten (om ze te verrijken voor opslag)
                            if (enrichedNewActivities.length > 0) {
                                enrichedNewActivities = enrichedNewActivities.map(act => {
                                    const actTime = new Date(act.date).getTime();
                                    const matchedStrava = stravaActivities.find(s => {
                                        const sTime = new Date(s.start_date_local || s.start_date).getTime();
                                        return Math.abs(actTime - sTime) < 900000;
                                    });

                                    if (matchedStrava) {
                                        const stravaTitle = (matchedStrava.name || '').trim();
                                        return {
                                            ...act,
                                            strava_id: String(matchedStrava.id),
                                            gear_id: matchedStrava.gear_id || null,
                                            ...(stravaTitle && { title: stravaTitle })
                                        };
                                    }
                                    return act;
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Auto-enrichment via Strava failed.", err);
                } finally {
                    setIsEnriching(false);
                }
            }

            // STAP 3: Geef de resultaten terug
            onSyncResults(enrichedNewActivities);

        } catch (e) {
            alert("Sync error: " + e.message);
            setIsEnriching(false);
        }
    };

    const isLoading = isSyncing || isEnriching;
    const buttonText = isSyncing ? 'Fetching Intervals…' : (isEnriching ? 'Linking Strava data…' : 'Sync Now');

    return (
        <div className="bg-cdbg/50 border border-cdborder rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                <RefreshCw size={20} className={`text-orange-400 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Activities
            </h3>

            <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-cdmuted block mb-1">From</span><NlDateInput value={syncDates.start} onChange={(v) => setSyncDates((s) => ({ ...s, start: v }))} className="w-full bg-cdsurface border border-cdborder rounded p-2 text-cdtext text-sm" aria-label="Sync van (dd/mm/jjjj)" /></div>
                <div><span className="text-xs text-cdmuted block mb-1">To</span><NlDateInput value={syncDates.end} onChange={(v) => setSyncDates((s) => ({ ...s, end: v }))} className="w-full bg-cdsurface border border-cdborder rounded p-2 text-cdtext text-sm" aria-label="Sync tot (dd/mm/jjjj)" /></div>
            </div>

            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase font-bold text-cdmuted">Types</label>
                    <div className="space-x-2">
                        <button type="button" onClick={() => setAllSportFilters(true)} className="text-[10px] text-blue-400 hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded px-1 transition-colors">All</button>
                        <button type="button" onClick={() => setAllSportFilters(false)} className="text-[10px] text-blue-400 hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded px-1 transition-colors">None</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SPORT_TYPES.map(type => (
                        <label key={type} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${sportFilters[type] ? 'bg-orange-500/20 border-orange-500/50 text-cdtext' : 'bg-cdsurface border-cdborder text-cdmuted hover:border-cdmuted'}`}>
                            <input type="checkbox" checked={sportFilters[type] || false} onChange={() => toggleSportFilter(type)} className="hidden" />
                            {sportFilters[type] && <CheckCircle size={12} className="text-orange-400" />} {type}
                        </label>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-cdborder">
                <button
                    onClick={handleSync}
                    disabled={isLoading}
                    className="w-full py-3 flex justify-center items-center gap-2 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                    {isLoading && <Loader2 size={18} className="animate-spin" />}
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default SyncTab;
