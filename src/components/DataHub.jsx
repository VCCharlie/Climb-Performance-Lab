import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, Trash, Split, RefreshCw, ExternalLink, GitBranch, Zap, ChevronDown } from 'lucide-react';
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
import ActivityDetailModal from './DataHub/ActivityDetailModal';
import StravaEnrichTab from './DataHub/StravaEnrichTab';

// Hooks
import useActivityFilter from '../hooks/useActivityFilter';

// --- MAIN COMPONENT ---
// githubPat: optional GitHub Personal Access Token for manual workflow dispatch
// showImport: soft-toggle to show/hide the legacy CSV import section (default: false)
// stravaGetToken: function to get a valid Strava access token (or null if not connected)
// startDate / endDate: globale datumrange vanuit App.jsx tab-lint
// stravaEnrichResults / onStravaEnrichResults: persistente match-resultaten over tab-wissels
const DataHub = ({ activities, onImport, onDelete, onClear, githubPat, showImport = false, stravaGetToken, startDate, endDate, stravaEnrichResults, onStravaEnrichResults }) => {
    // UI State
    const [internalTab, setInternalTab] = useState('log');
    const [detailActivity, setDetailActivity] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [editingActivity, setEditingActivity] = useState(null);
    const [showNoPowerModal, setShowNoPowerModal] = useState(false);
    const [noPowerSelected, setNoPowerSelected] = useState([]);
    const [showUtilMenu, setShowUtilMenu] = useState(false);
    const utilMenuRef = useRef(null);

    // Import/Sync State
    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [rawData, setRawData] = useState(null); // Debug
    const [isSyncingGithub, setIsSyncingGithub] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null
    const [syncErrorDetail, setSyncErrorDetail] = useState(null); // detailed error string from GitHub API

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

    // Importeer nieuwe activiteiten vanuit Strava (ongematchte activiteiten)
    const handleImportFromStrava = async (newActs) => {
        if (!newActs || newActs.length === 0) return;
        onImport(newActs);
        if (db) {
            try {
                await Promise.all(newActs.map(act =>
                    setDoc(doc(db, 'activities', String(act.id)), act, { merge: true })
                ));
            } catch (e) {
                console.error('Strava import Firestore fout:', e);
            }
        }
    };

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

    const openNoPowerFilter = () => {
        const noPower = (activities || []).filter(a => !(Number(a.avg_power) > 0));
        if (noPower.length === 0) {
            alert("Alle activiteiten hebben vermogensdata. Niets te filteren.");
            return;
        }
        setNoPowerSelected(noPower.map(a => a.id));
        setShowNoPowerModal(true);
        setShowUtilMenu(false);
    };

    const deleteNoPowerSelected = async () => {
        if (noPowerSelected.length === 0) return;
        setIsDeleting(true);
        try {
            for (const id of noPowerSelected) {
                if (db) await deleteDoc(doc(db, "activities", String(id)));
                onDelete(id);
            }
            setShowNoPowerModal(false);
            setNoPowerSelected([]);
        } catch (e) {
            alert("Fout bij verwijderen: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    // Sluit het util-menu bij klik buiten het menu
    useEffect(() => {
        const handler = (e) => {
            if (utilMenuRef.current && !utilMenuRef.current.contains(e.target)) {
                setShowUtilMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /**
     * Triggers the nightly sync GitHub Actions workflow on demand.
     * Strategy:
     *  1. List all workflows in the repo to find the nightly-sync workflow dynamically.
     *  2. Trigger the found workflow via workflow_dispatch.
     *
     * Requires a GitHub PAT (classic or fine-grained) with `workflow` / `actions:write` scope.
     */
    const triggerGithubSync = async () => {
        if (!githubPat) {
            alert('Geen GitHub PAT ingesteld. Voeg een Personal Access Token toe onder Instellingen → Sync.');
            return;
        }
        setIsSyncingGithub(true);
        setSyncStatus(null);
        setSyncErrorDetail(null);

        const REPO = 'VCCharlie/Climb-Performance-Lab';
        const HEADERS = {
            Authorization: `Bearer ${githubPat}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        };

        try {
            // Step 1: list workflows to find the correct filename/id
            const listRes = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows`, { headers: HEADERS });

            if (!listRes.ok) {
                const errBody = await listRes.json().catch(() => listRes.text());
                const msg = errBody?.message || JSON.stringify(errBody);
                console.error('[Sync] Workflow list failed:', listRes.status, msg);
                setSyncErrorDetail(`${listRes.status}: ${msg}`);
                setSyncStatus('error');
                return;
            }

            const { workflows = [] } = await listRes.json();
            console.log('[Sync] Available workflows:', workflows.map(w => w.path));

            // Pick the nightly / sync workflow (flexible name matching)
            const target = workflows.find(w =>
                w.path.toLowerCase().includes('nightly') ||
                w.path.toLowerCase().includes('sync')
            );

            if (!target) {
                const paths = workflows.map(w => w.path).join(', ') || '(geen)';
                setSyncErrorDetail(`Geen nightly-sync workflow gevonden. Aanwezige workflows: ${paths}`);
                setSyncStatus('error');
                return;
            }

            console.log('[Sync] Triggering workflow:', target.path);

            // Step 2: dispatch the workflow
            const dispatchRes = await fetch(
                `https://api.github.com/repos/${REPO}/actions/workflows/${target.id}/dispatches`,
                {
                    method: 'POST',
                    headers: HEADERS,
                    body: JSON.stringify({ ref: 'main' }),
                }
            );

            if (dispatchRes.status === 204) {
                setSyncStatus('success');
                setTimeout(() => { setSyncStatus(null); setSyncErrorDetail(null); }, 10000);
            } else {
                const errBody = await dispatchRes.json().catch(() => ({ message: `HTTP ${dispatchRes.status}` }));
                const msg = errBody?.message || `HTTP ${dispatchRes.status}`;
                console.error('[Sync] Dispatch failed:', dispatchRes.status, errBody);
                setSyncErrorDetail(`${dispatchRes.status}: ${msg}`);
                setSyncStatus('error');
                setTimeout(() => { setSyncStatus(null); setSyncErrorDetail(null); }, 10000);
            }
        } catch (err) {
            console.error('[Sync] Fetch error:', err);
            setSyncErrorDetail(err.message);
            setSyncStatus('error');
            setTimeout(() => { setSyncStatus(null); setSyncErrorDetail(null); }, 10000);
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
                    // Require BOTH duration AND distance to match (AND, not OR)
                    return timeDiff < 300 && distDiff < 0.5;
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
            {detailActivity && (
                <ActivityDetailModal
                    activity={detailActivity}
                    onClose={() => setDetailActivity(null)}
                    getStravaToken={stravaGetToken}
                />
            )}
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

            {/* No Power Modal */}
            {showNoPowerModal && (() => {
                const noPowerList = (activities || []).filter(a => !(Number(a.avg_power) > 0));
                const allSelected = noPowerList.every(a => noPowerSelected.includes(a.id));
                const toggleAll = () => setNoPowerSelected(allSelected ? [] : noPowerList.map(a => a.id));
                const toggleOne = (id) => setNoPowerSelected(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
                return (
                    <div className="fixed inset-0 bg-cdbg/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-cdsurface border border-cdborder rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-center p-4 border-b border-cdborder">
                                <div>
                                    <h3 className="text-cdtext font-bold flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-400" />
                                        Activiteiten zonder vermogen ({noPowerList.length})
                                    </h3>
                                    <p className="text-xs text-cdmuted mt-0.5">Selecteer welke je wilt verwijderen.</p>
                                </div>
                                <button onClick={() => setShowNoPowerModal(false)} className="text-cdmuted hover:text-cdtext text-lg font-bold px-2">✕</button>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 border-b border-cdborder bg-cdbg/40">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-yellow-400 w-4 h-4" />
                                <span className="text-xs text-cdmuted font-bold uppercase">Alles selecteren</span>
                                <span className="ml-auto text-xs text-cdmuted">{noPowerSelected.length} geselecteerd</span>
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {noPowerList.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-cdborder/40 hover:bg-cdborder/20">
                                        <input
                                            type="checkbox"
                                            checked={noPowerSelected.includes(a.id)}
                                            onChange={() => toggleOne(a.id)}
                                            className="accent-yellow-400 w-4 h-4 shrink-0"
                                        />
                                        <span className="text-xs text-cdmuted w-24 shrink-0">{a.date}</span>
                                        <span className="text-sm text-cdtext flex-1 truncate">{a.title || 'Untitled'}</span>
                                        <span className="text-xs text-cdmuted w-16 text-right shrink-0">{a.distance ? `${a.distance} km` : '-'}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 p-4 border-t border-cdborder">
                                <button onClick={() => setShowNoPowerModal(false)} className="px-4 py-2 text-cdmuted hover:text-cdtext font-bold text-sm">Sluiten</button>
                                <button
                                    onClick={deleteNoPowerSelected}
                                    disabled={isDeleting || noPowerSelected.length === 0}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
                                    Verwijder {noPowerSelected.length} activiteiten
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* TABS */}
            <div className="flex border-b border-cdborder">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Activity Log</button>
                {/* Strava Verrijking tab — zichtbaar als Strava is gekoppeld */}
                {stravaGetToken && (
                    <button onClick={() => setInternalTab('strava')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Verrijking
                    </button>
                )}
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
                            <div className={`flex flex-col gap-1 text-xs font-bold px-3 py-2 rounded-lg mb-3 ${syncStatus === 'success'
                                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}
                            >
                                <span>
                                    {syncStatus === 'success'
                                        ? '✅ Sync gestart! Activiteiten worden bijgewerkt in Firebase (duurt ~1 minuut).'
                                        : '❌ Sync mislukt.'}
                                </span>
                                {syncStatus === 'error' && syncErrorDetail && (
                                    <span className="font-mono font-normal opacity-80 break-words">{syncErrorDetail}</span>
                                )}
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
                                {/* Utility menu — Sync Now / Duplicates / No Power / Clear DB */}
                                <div className="relative" ref={utilMenuRef}>
                                    <button
                                        onClick={() => setShowUtilMenu(v => !v)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-yellow-400 transition-all"
                                    >
                                        Tools <ChevronDown size={14} className={showUtilMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                    </button>
                                    {showUtilMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-cdsurface border border-cdborder rounded-lg shadow-xl z-50 overflow-hidden">
                                            <button
                                                onClick={() => { triggerGithubSync(); setShowUtilMenu(false); }}
                                                disabled={isSyncingGithub || !githubPat}
                                                title={githubPat ? 'Sync via GitHub Actions (laatste 14 dagen)' : 'Voeg GitHub PAT toe in Instellingen'}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-cdborder disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <RefreshCw size={14} className={isSyncingGithub ? 'animate-spin' : ''} />
                                                {isSyncingGithub ? 'Bezig...' : 'Sync Now'}
                                            </button>
                                            <button
                                                onClick={() => { findDuplicates(); setShowUtilMenu(false); }}
                                                disabled={!activities || activities.length === 0}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-cdborder disabled:opacity-40"
                                            >
                                                <Split size={14} /> Duplicates
                                            </button>
                                            <button
                                                onClick={openNoPowerFilter}
                                                disabled={!activities || activities.length === 0}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-400 hover:bg-cdborder disabled:opacity-40"
                                            >
                                                <Zap size={14} /> No Power
                                            </button>
                                            <div className="border-t border-cdborder" />
                                            <button
                                                onClick={() => { handleClearDatabase(); setShowUtilMenu(false); }}
                                                disabled={isDeleting || !activities || activities.length === 0}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-cdborder disabled:opacity-40"
                                            >
                                                {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
                                                Clear DB
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                                onViewDetail={setDetailActivity}
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

                {internalTab === 'strava' && (
                    <StravaEnrichTab
                        activities={activities}
                        getStravaToken={stravaGetToken}
                        onImportNew={handleImportFromStrava}
                        startDate={startDate}
                        endDate={endDate}
                        persistedResults={stravaEnrichResults}
                        onResultsChange={onStravaEnrichResults}
                    />
                )}
            </div>
        </div>
    );
};

export default DataHub;