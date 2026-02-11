
import React, { useState, useMemo } from 'react';
import {
    Search, Loader2, AlertTriangle, Trash, Split, Download, Upload, ArrowUpRight
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { smartParseCSV, smartParseJSON, normalizeIntervalsActivity, formatDateDDMMYYYY, formatTime, findDuplicatesInList, isSameActivity } from '../utils';

import { ACTIVITY_COLUMNS, SPORT_TYPES, MONTH_ORDER } from '../config';

// Sub-components
import EditActivityModal from './data-hub/EditActivityModal';
import ActivityTable from './data-hub/ActivityTable';
import ImportModal from './data-hub/ImportModal';
import SyncPanel from './data-hub/SyncPanel';
import DuplicateResolver from './data-hub/DuplicateResolver';
import QuickNav from './data-hub/QuickNav';

// CONFIG
const CLOUD_SYNC_URL = "https://sync-intervals-97555677694.europe-west1.run.app";

// --- HELPER: DATA GUARD ---
const isValidActivity = (act) => {
    return act && act.id && act.date;
};

// --- MAIN COMPONENT ---
const DataHub = ({ activities, onImport, onDelete, onClear, intervalsConfig }) => {
    const [internalTab, setInternalTab] = useState('log');
    const [importText, setImportText] = useState("");
    const [search, setSearch] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [expandedYears, setExpandedYears] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [indoorFilter, setIndoorFilter] = useState('all'); // 'all', 'indoor', 'outdoor'

    // EDIT STATE
    const [editingActivity, setEditingActivity] = useState(null);

    const [syncDates, setSyncDates] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [sportFilters, setSportFilters] = useState(
        SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
    );

    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [rawData, setRawData] = useState(null); // Voor debuggen
    const [syncProgress, setSyncProgress] = useState(null);

    // Logic Helpers
    const toggleSportFilter = (type) => setSportFilters(prev => ({ ...prev, [type]: !prev[type] }));
    const setAllSportFilters = (val) => setSportFilters(SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: val }), {}));
    const toggleYear = (year) => setExpandedYears(p => ({ ...p, [year]: !p[year] }));
    const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });
    const requestPreviewSort = (key) => setPreviewSortConfig({ key, direction: previewSortConfig.key === key && previewSortConfig.direction === 'desc' ? 'asc' : 'desc' });

    // --- ACTIONS ---

    // SAVE EDIT (FIREBASE + LOCAL)
    const handleSaveEdit = async (updatedActivity) => {
        try {
            if (db) {
                await setDoc(doc(db, "activities", String(updatedActivity.id)), updatedActivity, { merge: true });
                console.log("Activity updated in Firebase");
            }
            setEditingActivity(null);
        } catch (e) {
            console.error("Error updating activity:", e);
            alert("Fout bij opslaan wijziging: " + e.message);
        }
    };

    const handleDeleteSingle = async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, "activities", String(id)));
            } catch (e) {
                console.error("Firebase delete failed:", e);
                alert("Kon activiteit niet verwijderen uit database.");
                return;
            }
        }
        onDelete(id);
        setDeleteConfirm(null);
    };

    const handleClearDatabase = async () => {
        if (!confirm("WEET JE HET ZEKER?\n\nHiermee verwijder je ALLE activiteiten uit de database.")) return;
        if (!confirm("ECHT ZEKER? Typ 'JA' in je hoofd en klik OK.")) return;
        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                const promises = activities.map(act => deleteDoc(doc(db, "activities", String(act.id))));
                await Promise.all(promises);
            }
            if (onClear) onClear();
            alert("Database succesvol gewist. Klaar voor een schone start!");
        } catch (e) {
            alert("Fout bij wissen database: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const findDuplicates = () => {
        if (!activities || activities.length === 0) return;

        const foundDups = findDuplicatesInList(activities);

        if (foundDups.length > 0) {
            setDuplicates(foundDups);
            setShowDuplicateModal(true);
        } else {
            alert("Geen duplicaten gevonden! Je database is clean.");
        }
    };

    const resolveDuplicate = async (action, dup) => {
        const { a, b } = dup;
        // ACTIONS: 'keepA' (delete B), 'keepB' (delete A), 'keepBoth' (delete None), 'deleteBoth' (delete A & B)

        let idsToDelete = [];
        if (action === 'keepA') idsToDelete.push(b.id);
        if (action === 'keepB') idsToDelete.push(a.id);
        if (action === 'deleteBoth') idsToDelete.push(a.id, b.id);

        if (idsToDelete.length > 0) {
            // Update Local
            idsToDelete.forEach(id => onDelete(id));

            // Update Firebase
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) {
                    console.error("Failed to delete resolved duplicates:", e);
                }
            }
        }

        // Remove from list
        setDuplicates(prev => prev.filter(d => d !== dup));
        if (duplicates.length <= 1) setShowDuplicateModal(false);
    };

    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setImportText(text);
            // Optionally auto-trigger import? User probably wants to review/click 'Process'
            // handleManualImport(text); 
        };
        reader.readAsText(file);
    };

    // --- MANUAL IMPORT ---
    const handleManualImport = () => {
        const text = importText.trim();
        if (!text) { alert("Plak eerst data in het veld."); return; }
        let parsedData = text.startsWith('[') || text.startsWith('{') ? smartParseJSON(text) : smartParseCSV(text);

        if (parsedData.length > 0) {
            setFetchedActivities(parsedData);
            setSelectedActivities(parsedData.map(r => r.id));
            setShowModal(true);
            setImportText("");
        } else {
            alert("Kon geen geldige activiteiten vinden.");
        }
    };

    const toggleActivityTypeInPreview = (id) => {
        setFetchedActivities(prev => prev.map(act => act.id === id ? { ...act, type: act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide' } : act));
    };

    // --- INTERVALS SYNC ---
    const handleIntervalsSync = async () => {
        setIsSyncing(true);
        setSyncProgress(null);

        // DEBUG: Clear logs
        console.clear();
        console.log("Starting Deep Sync (Robust Mode)...");

        // Helper: Fetch with Timeout
        const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        try {
            // 1. Fetch Activity List (Summaries)
            const params = new URLSearchParams({
                oldest: syncDates.start,
                newest: syncDates.end
            });
            const listUrl = `https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?${params}`;
            console.log("Fetching summaries from:", listUrl);

            // Intervals.icu API uses Basic Auth with username 'API_KEY'
            const authHeader = 'Basic ' + btoa(`API_KEY:${intervalsConfig.apiKey}`);

            const listResponse = await fetchWithTimeout(listUrl, {
                headers: { 'Authorization': authHeader }
            });

            if (!listResponse.ok) throw new Error(`Failed to fetch activities list: ${listResponse.status}`);
            const summaryData = await listResponse.json();
            console.log(`Fetched ${summaryData.length} summaries.`);

            if (summaryData.length === 0) {
                alert('No activities found in range.');
                setIsSyncing(false);
                return;
            }

            // 2. Deep Sync - Fetch Details individually with concurrency
            const BATCH_SIZE = 5; // Conservative batch size to avoid rate limits
            let detailedActivities = [];

            // We want to fetch details for ALL items to get max_watts etc.
            // But we can respect the batching.
            const total = summaryData.length;

            for (let i = 0; i < total; i += BATCH_SIZE) {
                const batchSummaries = summaryData.slice(i, i + BATCH_SIZE);
                const progressMsg = `Fetching details: ${Math.min(i + BATCH_SIZE, total)} / ${total}`;
                setSyncProgress(progressMsg);
                console.log(progressMsg);

                // Create array of promises for this batch
                const batchPromises = batchSummaries.map(async (summary) => {
                    const detailUrl = `https://intervals.icu/api/v1/activity/${summary.id}?intervals=true`;

                    try {
                        // Need to pass authHeader or recreate it here? 
                        // It is available in outer scope (functional component scope? No, `authHeader` is in `handleIntervalsSync` scope)
                        const authHeader = 'Basic ' + btoa(`API_KEY:${intervalsConfig.apiKey}`);

                        const res = await fetchWithTimeout(detailUrl, {
                            headers: { 'Authorization': authHeader }
                        }, 10000); // 10s timeout per detail

                        if (res.ok) return await res.json();
                        console.warn(`Failed to fetch detail for ${summary.id}: ${res.status}`);
                        return summary; // Fallback to summary if detail fails
                    } catch (err) {
                        console.error(`Error fetching detail for ${summary.id}:`, err);
                        return summary; // Fallback to summary
                    }
                });

                // Wait for all in this batch
                const batchResults = await Promise.all(batchPromises);
                detailedActivities.push(...batchResults);

                // Rate limiter breathing room
                await new Promise(r => setTimeout(r, 500));
            }

            console.log(`Deep Sync complete. Processed ${detailedActivities.length} activities.`);

            // 3. Normalize and Store
            if (detailedActivities.length > 0) {
                setRawData(detailedActivities[0]); // store first detailed item for debug
                // Also log one for inspection
                console.log("Sample detailed activity:", detailedActivities[0]);
            }

            const newRides = detailedActivities.map(normalizeIntervalsActivity);
            setFetchedActivities(newRides);
            setSelectedActivities(newRides.map(r => r.id));
            setInternalTab('import');
            setShowModal(true);
            setSyncProgress(null);

        } catch (error) {
            console.error('Intervals Sync Error:', error);
            if (error.name === 'AbortError') {
                alert("Sync timed out. Please try a shorter date range.");
            } else {
                alert(`Sync failed: ${error.message}`);
            }
            setSyncProgress(null);
        } finally {
            setIsSyncing(false);
        }
    };

    const confirmImport = async () => {
        const toImport = fetchedActivities.filter(a => selectedActivities.includes(a.id));

        let savedCount = 0;
        let replacedCount = 0;
        const idsToDelete = [];

        // Deduplication Logic
        if (activities && activities.length > 0) {
            toImport.forEach(newAct => {
                const newDate = newAct.date.split('T')[0];

                // Find potential duplicates
                const duplicate = activities.find(existing => {
                    if (existing.id === newAct.id) return false; // meaningful update, not a duplicate id
                    const exDate = existing.date.split('T')[0];
                    if (exDate !== newDate) return false;

                    // Check Type
                    if (existing.type !== newAct.type && existing.type !== 'Ride' && newAct.type !== 'Ride') return false;

                    // Check similarity (Time or Distance)
                    const timeDiff = Math.abs((existing.moving_time || 0) - (newAct.moving_time || 0));
                    const distDiff = Math.abs((existing.distance || 0) - (newAct.distance || 0));

                    // Match if time within 5 mins OR distance within 1km
                    return timeDiff < 300 || distDiff < 1.0;
                });

                if (duplicate) {
                    idsToDelete.push(duplicate.id);
                    replacedCount++;
                    console.log(`Replace duplicate: deleting ${duplicate.id} (${duplicate.title}) for new ${newAct.id}`);
                }
            });
        }

        // 1. Delete Replaced items
        if (idsToDelete.length > 0) {
            idsToDelete.forEach(id => onDelete(id)); // Update local state immediately via prop
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) {
                    console.error("Failed to delete duplicates from FB:", e);
                }
            }
        }

        // 2. Import New items
        onImport(toImport);

        if (db) {
            try {
                // Use Promise.all for faster parallel writes
                const writePromises = toImport.map(act => {
                    if (act.id) {
                        return setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
                    }
                    return Promise.resolve();
                });
                await Promise.all(writePromises);
                savedCount = toImport.length;
                console.log(`Saved ${savedCount} activities to Firebase`);
            } catch (e) {
                alert("Let op: Data lokaal geïmporteerd, maar Cloud backup mislukt: " + e.message);
            }
        }

        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');

        const summaryMsg = `Import Successful!\n\nImported: ${savedCount}\nReplaced Duplicates: ${replacedCount}`;
        alert(summaryMsg);
    };

    // Sorting & Filtering
    const processedActivities = useMemo(() => {
        if (!activities) return [];
        let filtered = activities.filter(a => {
            if (!isValidActivity(a)) return false;

            // Indoor/Outdoor Filter
            if (indoorFilter === 'indoor' && !['VirtualRide', 'VirtualRun'].includes(a.type)) return false;
            if (indoorFilter === 'outdoor' && ['VirtualRide', 'VirtualRun'].includes(a.type)) return false;

            // Search
            const searchLower = search.toLowerCase();
            if (!searchLower) return true;

            // 1. Title Match
            if (a.title && a.title.toLowerCase().includes(searchLower)) return true;

            // 2. Date Match (flexible: 2024-02-04 OR 4-2-2024 OR 04-02-2024)
            if (a.date) {
                if (a.date.includes(searchLower)) return true; // YYYY-MM-DD match

                try {
                    const d = new Date(a.date);
                    const day = d.getDate();
                    const month = d.getMonth() + 1;
                    const year = d.getFullYear();
                    const dmy = `${day}-${month}-${year}`; // 4-2-2024
                    const ddmm = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`; // 04-02-2024
                    if (dmy.includes(searchLower) || ddmm.includes(searchLower)) return true;
                } catch (e) { }
            }

            return false;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal ? bVal.toLowerCase() : ''; }
                else { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [activities, search, sortConfig, indoorFilter]);

    const sortedFetchedActivities = useMemo(() => {
        if (!fetchedActivities) return [];
        const list = [...fetchedActivities];
        if (previewSortConfig.key) {
            list.sort((a, b) => {
                let aVal = a[previewSortConfig.key];
                let bVal = b[previewSortConfig.key];
                if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal ? bVal.toLowerCase() : ''; }
                else { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
                if (aVal < bVal) return previewSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return previewSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [fetchedActivities, previewSortConfig]);

    const isGroupedView = sortConfig.key === 'date';
    const groupedActivities = useMemo(() => {
        if (!isGroupedView) return null;
        const groups = {};
        processedActivities.forEach(act => {
            try {
                const d = new Date(act.date);
                const y = d.getFullYear();
                const m = d.toLocaleString('en-US', { month: 'long' });
                if (!groups[y]) groups[y] = {};
                if (!groups[y][m]) groups[y][m] = [];
                groups[y][m].push(act);
            } catch (e) { }
        });
        return groups;
    }, [processedActivities, isGroupedView]);

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">

            {/* EDIT MODAL */}
            {editingActivity && (
                <EditActivityModal
                    activity={editingActivity}
                    onClose={() => setEditingActivity(null)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* IMPORT MODAL */}
            <ImportModal
                showModal={showModal}
                onClose={() => setShowModal(false)}
                fetchedActivities={fetchedActivities}
                selectedActivities={selectedActivities}
                setSelectedActivities={setSelectedActivities}
                toggleActivityTypeInPreview={toggleActivityTypeInPreview}
                previewSortConfig={previewSortConfig}
                requestPreviewSort={requestPreviewSort}
                confirmImport={confirmImport}
                rawData={rawData}
                sortedFetchedActivities={sortedFetchedActivities}
            />


            {/* DUPLICATE RESOLUTION MODAL */}
            {showDuplicateModal && (
                <DuplicateResolver
                    duplicates={duplicates}
                    onResolve={resolveDuplicate}
                    onClose={() => setShowDuplicateModal(false)}
                />
            )}

            {/* TABS */}
            <div className="flex border-b border-slate-700">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
                <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Sync (API)</button>
                <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Import (CSV/JSON)</button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                            <div className="flex gap-2 w-full md:w-auto flex-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (name or 4-2-2024)..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-yellow-400" />
                                </div>
                                <div className="flex bg-slate-900 rounded border border-slate-600 p-1">
                                    <button onClick={() => setIndoorFilter('all')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>All</button>
                                    <button onClick={() => setIndoorFilter('outdoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'outdoor' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Out</button>
                                    <button onClick={() => setIndoorFilter('indoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'indoor' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>In</button>
                                </div>
                            </div>


                            <div className="flex gap-2">
                                {/* DUPLICATE BUTTON */}
                                <button
                                    onClick={findDuplicates}
                                    disabled={!activities || activities.length === 0}
                                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50"
                                    title="Zoek dubbele activiteiten (Wahoo/Strava sync issues)"
                                >
                                    <Split size={16} /> Duplicates
                                </button>

                                <button
                                    onClick={handleClearDatabase}
                                    disabled={isDeleting || !activities || activities.length === 0}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash size={16} />}
                                    {isDeleting ? 'Wissen...' : 'Clear DB'}
                                </button>
                            </div>
                        </div>

                        {/* QUICK NAV */}
                        {isGroupedView && (
                            <QuickNav
                                groupedActivities={groupedActivities}
                                expandedYears={expandedYears}
                                onToggleYear={toggleYear}
                            />
                        )}

                        {!activities ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
                        ) : processedActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 border border-dashed border-slate-700 rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
                        ) : (
                            <ActivityTable
                                activities={isGroupedView ? groupedActivities : processedActivities}
                                sortConfig={sortConfig}
                                onSort={requestSort}
                                onDelete={handleDeleteSingle}
                                onEdit={setEditingActivity}
                                isGroupedView={isGroupedView}
                                expandedYears={expandedYears}
                                onToggleYear={toggleYear}
                                deleteConfirm={deleteConfirm}
                                setDeleteConfirm={setDeleteConfirm}
                            />
                        )}
                    </>
                )}

                {internalTab === 'intervals' && (
                    <SyncPanel
                        syncDates={syncDates}
                        setSyncDates={setSyncDates}
                        sportFilters={sportFilters}
                        toggleSportFilter={toggleSportFilter}
                        setAllSportFilters={setAllSportFilters}
                        isSyncing={isSyncing}
                        syncProgress={syncProgress}
                        handleIntervalsSync={handleIntervalsSync}
                    />
                )}

                {internalTab === 'import' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                            <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><Download size={16} className="text-blue-400" /> Stap 1: Download Data</h4>
                            <p className="text-xs text-slate-400 mb-3">Ga naar de Intervals Activities pagina, klik op "List View", selecteer je ritten en kies <strong>Edit &gt; Export CSV</strong>.</p>
                            <a href={`https://intervals.icu/athlete/${intervalsConfig.athleteId}/activities`} target="_blank" rel="noreferrer" className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded inline-flex items-center gap-2 transition-colors">Open Intervals.icu Activities <ArrowUpRight size={12} /></a>
                        </div>

                        <div>
                            <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2"><Upload size={16} className="text-green-400" /> Stap 2: Importeer Bestand</h4>

                            {/* DRAG & DROP ZONE */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handleFileUpload(e.dataTransfer.files[0]);
                                    }
                                }}
                                onClick={() => document.getElementById('fileInput').click()}
                                className={`
                                    border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all
                                    ${isDragging ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800'}
                                `}
                            >
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept=".csv,.json"
                                    className="hidden"
                                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                                />
                                <Upload className={`mx-auto mb-2 ${isDragging ? 'text-yellow-400' : 'text-slate-400'}`} size={32} />
                                <p className="text-sm font-bold text-white">Klik om te openen / Sleep bestand hierheen</p>
                                <p className="text-xs text-slate-500 mt-1">Ondersteunt .csv en .json export van Intervals.icu</p>
                            </div>

                            <div className="relative">
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 px-2 text-[10px] text-slate-500 uppercase font-bold">Of plak tekst</span>
                                <textarea
                                    className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white focus:border-yellow-400 outline-none transition-colors"
                                    placeholder="Plak de CSV tekst hier..."
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                />
                            </div>

                            <button onClick={handleManualImport} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-3 rounded shadow-lg shadow-yellow-400/20 transition-all">Verwerk Data (CSV of JSON)</button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default DataHub;