import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, Trash, Split, RefreshCw, ExternalLink, GitBranch, Zap, ChevronDown } from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { findDuplicatesInList } from '../utils';
import { matchStravaToSite, normalizeStravaActivity, STRAVA_BIKE_TYPES } from '../utils/stravaMatch';

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
import StravaProfileTab from './DataHub/StravaProfileTab';

// Hooks
import useActivityFilter from '../hooks/useActivityFilter';
import useIntervalsSync from '../hooks/useIntervalsSync';

const DataHub = ({
    activities,
    onImport,
    onDelete,
    onClear,
    onRefresh,
    // githubPat,
    intervalsConfig, // New Prop
    showImport = false,
    stravaGetToken,
    startDate,
    endDate,
    stravaEnrichResults,
    onStravaEnrichResults,
    stravaAthleteId,
    stravaProfileData,
    onStravaProfileData
}) => {
    // UI State
    const [internalTab, setInternalTab] = useState('log');
    const [detailActivity, setDetailActivity] = useState(null);
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
    const [rawData, setRawData] = useState(null);

    // NEW DIRECT SYNC STATE
    const { syncIntervals, isSyncing, syncProgress } = useIntervalsSync(intervalsConfig);
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncErrorDetail, setSyncErrorDetail] = useState(null);

    const deferredActivities = React.useDeferredValue(activities);

    const {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        processedActivities, groupedActivities, isGroupedView
    } = useActivityFilter(deferredActivities);


    // --- 1. STANDALONE STRAVA ENRICHMENT FUNCTIE ---
    const performSilentStravaEnrichment = async (actsToEnrich) => {
        if (!stravaGetToken) return 0;
        try {
            const token = await stravaGetToken();
            if (!token) return 0;

            const afterTs = Math.floor(new Date(startDate).getTime() / 1000);
            const beforeTs = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

            let page = 1;
            let allActivities = [];
            while (true) {
                const resp = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!resp.ok) break;
                const data = await resp.json();
                if (!Array.isArray(data) || data.length === 0) break;
                allActivities = allActivities.concat(data);
                if (data.length < 200) break;
                page++;
            }

            const bikeActivities = allActivities.filter(a => {
                if (!STRAVA_BIKE_TYPES.has(a.sport_type || a.type)) return false;
                const noPower = !a.average_watts || a.average_watts === 0;
                const isShort = !a.distance || (a.distance / 1000) < 5;
                if (noPower && isShort) return false;
                return true;
            });

            const result = matchStravaToSite(bikeActivities, actsToEnrich);
            const toEnrich = [];

            if (result?.matched?.length > 0) {
                toEnrich.push(...result.matched.filter(m => m.confidence !== 'low'));
            }
            if (result?.alreadyLinked?.length > 0) {
                toEnrich.push(...result.alreadyLinked);
            }

            if (toEnrich.length > 0 && db) {
                await Promise.all(toEnrich.map(m => {
                    const norm = normalizeStravaActivity(m.strava);
                    return setDoc(doc(db, 'activities', String(m.site.id)), {
                        strava_id: norm.strava_id,
                        title: norm.title,
                        type: norm.type,
                        ...(m.strava.gear_id && { gear_id: m.strava.gear_id })
                    }, { merge: true });
                }));
                return toEnrich.length;
            }
        } catch (err) {
            console.error("[Silent Enrichment] Failed:", err);
        }
        return 0;
    };


    // --- 2. REFACTORED DIRECT SYNC TRIGGER ---
    const handleSync = async () => {
        setShowUtilMenu(false);
        setSyncStatus('started');
        setSyncErrorDetail('Stap 1/2: Nieuwe activiteiten ophalen van Intervals.icu...');

        try {
            const sportFilters = SPORT_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {});
            const selectedTypes = Object.keys(sportFilters).filter(k => sportFilters[k]);

            // Validatie: als startDate of endDate leeg zijn (bijv. bij Custom range zonder selectie), stop dan
            if (!startDate || !endDate) {
                setSyncStatus('error');
                setSyncErrorDetail('❌ Fout: Selecteer eerst een geldige start- en einddatum (check de tijdsperiode rechtsboven).');
                setTimeout(() => setSyncStatus(null), 5000);
                return;
            }

            // 1. Haal nieuwe ritten op van Intervals
            const newActivities = await syncIntervals(startDate, endDate, selectedTypes);

            // 2. Bepaal welke bestaande ritten nog geen Strava koppeling hebben
            // We filteren op de huidige periode (globalStartDate/globalEndDate) om de API call efficient te houden
            const existingWithoutStrava = (activities || []).filter(act => {
                const actDate = act.date?.split('T')[0];
                return !act.strava_id && actDate >= startDate && actDate <= endDate;
            });

            const totalToEnrich = [...newActivities, ...existingWithoutStrava];

            if (totalToEnrich.length === 0) {
                setSyncStatus('done');
                setSyncErrorDetail('✅ Je bent helemaal bij! Geen nieuwe of onverrijkte activiteiten gevonden.');
                setTimeout(() => setSyncStatus(null), 5000);
                return;
            }

            setSyncErrorDetail(`Stap 2/2: ${newActivities.length} nieuwe ritten, ${existingWithoutStrava.length} te verrijken. Bezig met Strava...`);
            setSyncStatus('enriching');

            // De performSilentStravaEnrichment functie doet de matching en de Firestore writes voor verrijking
            const enrichedCount = await performSilentStravaEnrichment(totalToEnrich);

            // 3. Alleen de ECHT NIEUWE ritten opslaan in de database (de verrijking voor bestaande is al gedaan in performSilentStravaEnrichment)
            if (db && newActivities.length > 0) {
                await Promise.all(newActivities.map(act =>
                    setDoc(doc(db, 'activities', String(act.id)), act, { merge: true })
                ));
            }

            // Update local state voor de nieuwe ritten
            if (newActivities.length > 0) {
                onImport(newActivities);
            }

            setSyncStatus('done');
            setSyncErrorDetail(`✅ Sync voltooid! ${newActivities.length} nieuw, ${enrichedCount} ritten (extra) verrijkt met Strava data.`);
            setTimeout(() => setSyncStatus(null), 8000);

        } catch (e) {
            console.error('[Sync Error]', e);
            setSyncStatus('error');
            setSyncErrorDetail(`❌ Fout bij synchroniseren: ${e.message}`);
        }
    };


    // --- OVERIGE BESTAANDE ACTIONS (Ongewijzigd) ---
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
            }
            setEditingActivity(null);
        } catch (e) {
            alert("Fout bij opslaan wijziging: " + e.message);
        }
    };

    const handleDeleteSingle = React.useCallback(async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, "activities", String(id)));
            } catch {
                alert("Kon activiteit niet verwijderen uit database.");
            }
        }
    }, []);

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
            }
            setShowNoPowerModal(false);
            setNoPowerSelected([]);
        } catch (e) {
            alert("Fout bij verwijderen: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        const handler = (e) => {
            if (utilMenuRef.current && !utilMenuRef.current.contains(e.target)) {
                setShowUtilMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const resolveDuplicate = async (action, dup) => {
        const { a, b } = dup;
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

    const handleDataDetected = (parsedData) => {
        if (!parsedData || parsedData.length === 0) return;
        setFetchedActivities(parsedData);
        setSelectedActivities(parsedData.map(r => r.id));
        setRawData(parsedData[0]);
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
                    return timeDiff < 300 && distDiff < 0.5;
                });

                if (duplicate) {
                    idsToDelete.push(duplicate.id);
                    replacedCount++;
                }
            });
        }

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
                alert("Let op: Data lokaal geïmporteerd, maar Cloud backup mislukt: " + e.message);
            }
        }

        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
        alert(`Import Successful!\n\nImported: ${savedCount}\nReplaced Duplicates: ${replacedCount}`);
    };

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
                    allActivities={activities}
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
                {stravaGetToken && (<>
                    <button onClick={() => setInternalTab('strava')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Verrijking
                    </button>
                    <button onClick={() => setInternalTab('strava-profile')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${internalTab === 'strava-profile' ? 'bg-cdborder text-orange-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
                        Strava Profiel
                    </button>
                </>)}
                {showImport && (
                    <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-cdborder text-yellow-400' : 'text-cdmuted hover:bg-cdborder/50'}`}>Import Data</button>
                )}
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <>
                        {/* DYNAMISCHE SYNC STATUS BANNER */}
                        {syncStatus && (
                            <div className={`flex flex-col gap-1 text-xs font-bold px-3 py-2 rounded-lg mb-3 ${syncStatus === 'success' || syncStatus === 'done' || syncStatus === 'enriching' || syncStatus === 'started'
                                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                                : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {(syncStatus === 'started' || syncStatus === 'enriching' || isSyncing) && <Loader2 size={14} className="animate-spin" />}
                                    {syncStatus === 'done' && '✅ '}
                                    {syncStatus === 'error' && '❌ '}
                                    {isSyncing ? (syncProgress || 'Bezig met synchroniseren...') : syncErrorDetail}
                                </span>
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
                                {onRefresh && (
                                    <button
                                        onClick={() => onRefresh()}
                                        className="flex items-center justify-center w-9 h-9 rounded border bg-cdsurface border-cdborder text-cdmuted hover:text-green-400 hover:border-green-500/50 transition-colors group"
                                        title="Data verversen"
                                    >
                                        <RefreshCw size={14} className="group-active:animate-spin" />
                                    </button>
                                )}

                                <div className="relative" ref={utilMenuRef}>
                                    <button
                                        onClick={() => setShowUtilMenu(v => !v)}
                                        className="flex items-center gap-1.5 px-3 h-9 rounded text-sm font-bold border bg-cdsurface border-cdborder text-cdtext hover:border-yellow-400 transition-all"
                                    >
                                        Tools <ChevronDown size={14} className={showUtilMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                    </button>
                                    {showUtilMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-cdsurface border border-cdborder rounded-lg shadow-xl z-50 overflow-hidden">
                                            <button
                                                onClick={handleSync}
                                                disabled={isSyncing}
                                                title={'Sync activities from Intervals.icu'}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-cdborder disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                                {isSyncing ? 'Bezig...' : 'Sync Now'}
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

                {internalTab === 'strava-profile' && (
                    <StravaProfileTab
                        getStravaToken={stravaGetToken}
                        athleteId={stravaAthleteId}
                        persistedData={stravaProfileData}
                        onDataChange={onStravaProfileData}
                    />
                )}
            </div>
        </div>
    );
};

export default DataHub;
