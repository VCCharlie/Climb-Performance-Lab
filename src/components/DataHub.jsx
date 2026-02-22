import React, { useState } from 'react';
import { Search, Loader2, AlertTriangle, Trash, Split, RefreshCw, ExternalLink, GitBranch } from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { findDuplicatesInList } from '../utils';

import { SPORT_TYPES } from '../config';

// Sub-components
import EditActivityModal from './data-hub/EditActivityModal';
import ActivityTable from './data-hub/ActivityTable';
import ImportModal from './data-hub/ImportModal';
import DuplicateResolver from './data-hub/DuplicateResolver';
import QuickNav from './data-hub/QuickNav';
import ImportSection from './data-hub/ImportSection';

// Hooks
import useActivityFilter from '../hooks/useActivityFilter';

// --- MAIN COMPONENT ---
// githubPat: optional GitHub Personal Access Token for manual workflow dispatch
// showImport: soft-toggle to show/hide the legacy CSV import section (default: false)
const DataHub = ({ activities, onImport, onDelete, onClear, githubPat, showImport = false }) => {
    // UI State
    const [internalTab, setInternalTab] = useState('log');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [editingActivity, setEditingActivity] = useState(null);

    // Import/Sync State
    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [rawData, setRawData] = useState(null); // Debug
    const [isSyncingGithub, setIsSyncingGithub] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

    // --- HOOKS ---

    // 1. Filtering & Sorting
    const {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        processedActivities, groupedActivities, isGroupedView
    } = useActivityFilter(activities);

    // --- ACTIONS ---

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

    const handleDeleteSingle = React.useCallback(async (id) => {
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
    }, [db, onDelete]);

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

    /**
     * Triggers the nightly-sync.yml GitHub Actions workflow on demand.
     * Requires a Personal Access Token (PAT) with `actions:write` scope,
     * stored in userSettings.githubPat and passed down as `githubPat` prop.
     */
    const triggerGithubSync = async () => {
        if (!githubPat) {
            alert('Geen GitHub PAT ingesteld. Voeg een Personal Access Token toe onder Instellingen → Sync.');
            return;
        }
        setIsSyncingGithub(true);
        setSyncStatus(null);
        try {
            const res = await fetch(
                'https://api.github.com/repos/VCCharlie/Climb-Performance-Lab/actions/workflows/nightly-sync.yml/dispatches',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${githubPat}`,
                        Accept: 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ref: 'main' }),
                }
            );
            if (res.status === 204) {
                setSyncStatus('success');
                // Auto-clear after 8s
                setTimeout(() => setSyncStatus(null), 8000);
            } else {
                const errText = await res.text();
                console.error('[Sync] GitHub API error:', errText);
                setSyncStatus('error');
                setTimeout(() => setSyncStatus(null), 6000);
            }
        } catch (err) {
            console.error('[Sync] Fetch error:', err);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus(null), 6000);
        } finally {
            setIsSyncingGithub(false);
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
            idsToDelete.forEach(id => onDelete(id));
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) {
                    console.error("Failed to delete resolved duplicates:", e);
                }
            }
        }
        setDuplicates(prev => prev.filter(d => d !== dup));
        if (duplicates.length <= 1) setShowDuplicateModal(false);
    };

    // --- IMPORT & SYNC HANDLERS ---

    const handleDataDetected = (parsedData) => {
        if (!parsedData || parsedData.length === 0) return;
        setFetchedActivities(parsedData);
        setSelectedActivities(parsedData.map(r => r.id));
        setRawData(parsedData[0]); // debug
        setShowModal(true);
    };

    const toggleActivityTypeInPreview = (id) => {
        setFetchedActivities(prev => prev.map(act => act.id === id ? { ...act, type: act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide' } : act));
    };

    const confirmImport = async () => {
        const toImport = fetchedActivities.filter(a => selectedActivities.includes(a.id));
        let savedCount = 0;
        let replacedCount = 0;
        const idsToDelete = [];

        // Deduplication Check
        if (activities && activities.length > 0) {
            toImport.forEach(newAct => {
                const newDate = newAct.date.split('T')[0];
                const duplicate = activities.find(existing => {
                    if (existing.id === newAct.id) return false;
                    const exDate = existing.date.split('T')[0];
                    if (exDate !== newDate) return false;
                    if (existing.type !== newAct.type && existing.type !== 'Ride' && newAct.type !== 'Ride') return false;
                    const timeDiff = Math.abs((existing.moving_time || 0) - (newAct.moving_time || 0));
                    const distDiff = Math.abs((existing.distance || 0) - (newAct.distance || 0));
                    return timeDiff < 300 || distDiff < 1.0;
                });

                if (duplicate) {
                    idsToDelete.push(duplicate.id);
                    replacedCount++;
                }
            });
        }

        // Action
        if (idsToDelete.length > 0) {
            idsToDelete.forEach(id => onDelete(id));
            if (db) {
                try {
                    await Promise.all(idsToDelete.map(id => deleteDoc(doc(db, "activities", String(id)))));
                } catch (e) { console.error("Failed to delete duplicates from FB:", e); }
            }
        }

        onImport(toImport);

        if (db) {
            try {
                const writePromises = toImport.map(act => {
                    if (act.id) return setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
                    return Promise.resolve();
                });
                await Promise.all(writePromises);
                savedCount = toImport.length;
            } catch (e) {
                alert("Let op: Data lokaal geÃ¯mporteerd, maar Cloud backup mislukt: " + e.message);
            }
        }

        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
        alert(`Import Successful!\n\nImported: ${savedCount}\nReplaced Duplicates: ${replacedCount}`);
    };

    // Sort setup for Import Modal (local to modal logic, keeping it simple here)
    const [previewSortConfig, setPreviewSortConfig] = useState({ key: 'date', direction: 'desc' });
    const requestPreviewSort = (key) => setPreviewSortConfig({ key, direction: previewSortConfig.key === key && previewSortConfig.direction === 'desc' ? 'asc' : 'desc' });
    const sortedFetchedActivities = React.useMemo(() => {
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


    return (
        <div className="bg-cdsurface rounded-xl border border-cdborder shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">
            {/* MODALS */}
            {editingActivity && (
                <EditActivityModal
                    activity={editingActivity}
                    onClose={() => setEditingActivity(null)}
                    onSave={handleSaveEdit}
                />
            )}
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
            {showDuplicateModal && (
                <DuplicateResolver
                    duplicates={duplicates}
                    onResolve={resolveDuplicate}
                    onClose={() => setShowDuplicateModal(false)}
                />
            )}

            {/* TABS */}
            <div className="flex border-b border-cdborder">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {/* Import tab is soft-hidden by default — code intact, render behind prop */}
                {showImport && (
                    <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
                )}
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <>
                        {/* Sync status feedback banner */}
                        {syncStatus && (
                            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg mb-3 ${syncStatus === 'success'
                                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}>
                                {syncStatus === 'success'
                                    ? '✅ Sync gestart! Activiteiten worden bijgewerkt in Firebase (duurt ~1 minuut).'
                                    : '❌ Sync mislukt. Controleer je GitHub PAT in Instellingen.'}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                            <div className="flex gap-2 w-full md:w-auto flex-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-cdmuted" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (name or 4-2-2024)..." className="w-full bg-cdbg border border-cdborder rounded pl-10 pr-4 py-2 text-sm text-cdtext outline-none focus:border-yellow-400" />
                                </div>
                                <div className="flex bg-cdbg rounded border border-cdborder p-1">
                                    <button onClick={() => setIndoorFilter('all')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'all' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>All</button>
                                    <button onClick={() => setIndoorFilter('outdoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'outdoor' ? 'bg-green-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>Out</button>
                                    <button onClick={() => setIndoorFilter('indoor')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${indoorFilter === 'indoor' ? 'bg-orange-600 text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}>In</button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* Manual sync trigger — calls GitHub Actions workflow dispatch */}
                                <button
                                    onClick={triggerGithubSync}
                                    disabled={isSyncingGithub}
                                    title={githubPat ? 'Sync nu uitvoeren via GitHub Actions' : 'Voeg GitHub PAT toe in Instellingen'}
                                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold border transition-all ${githubPat
                                            ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/40'
                                            : 'bg-cdborder/30 text-cdmuted border-cdborder cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <RefreshCw size={14} className={isSyncingGithub ? 'animate-spin' : ''} />
                                    {isSyncingGithub ? 'Bezig...' : 'Sync Now'}
                                </button>
                                <button onClick={findDuplicates} disabled={!activities || activities.length === 0} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50">
                                    <Split size={16} /> Duplicates
                                </button>
                                <button onClick={handleClearDatabase} disabled={isDeleting || !activities || activities.length === 0} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash size={16} />}
                                    {isDeleting ? 'Wissen...' : 'Clear DB'}
                                </button>
                            </div>
                        </div>

                        {isGroupedView && (
                            <QuickNav groupedActivities={groupedActivities} isYearExpanded={isYearExpanded} onToggleYear={toggleYear} />
                        )}

                        {!activities ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
                        ) : processedActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-cdmuted gap-2 border border-dashed border-cdborder rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
                        ) : (
                            <ActivityTable
                                activities={isGroupedView ? groupedActivities : processedActivities}
                                sortConfig={sortConfig}
                                onSort={requestSort}
                                onDelete={handleDeleteSingle}
                                onEdit={setEditingActivity}
                                isGroupedView={isGroupedView}
                                isYearExpanded={isYearExpanded}
                                onToggleYear={toggleYear}
                                isMonthExpanded={isMonthExpanded}
                                onToggleMonth={toggleMonth}
                                deleteConfirm={deleteConfirm}
                                setDeleteConfirm={setDeleteConfirm}
                            />
                        )}
                    </>
                )}

                {internalTab === 'import' && (
                    <ImportSection
                        onDataDetected={handleDataDetected}
                    />
                )}
            </div>
        </div>
    );
};

export default DataHub;