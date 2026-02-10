
import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Cloud, Download, Upload, Info, RefreshCw, X, Monitor, Bike, Footprints,
    Settings, ArrowUpDown, ArrowUpRight, ChevronUp, ChevronDown, ChevronRight,
    Trash2, CheckCircle, Mountain, Zap, AlertTriangle, Loader2, Trash, CopyPlus, Split, Edit2, Save, ExternalLink
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import { smartParseCSV, smartParseJSON, normalizeIntervalsActivity, formatDateDDMMYYYY, formatTime } from '../utils';
import { ACTIVITY_COLUMNS, SPORT_TYPES, MONTH_ORDER } from '../config';

// CONFIG
const CLOUD_SYNC_URL = "https://sync-intervals-97555677694.europe-west1.run.app";

// --- HELPER: DATA GUARD ---
const isValidActivity = (act) => {
    return act && act.id && act.date;
};

// --- NIEUW: EDIT MODAL COMPONENT ---
const EditActivityModal = ({ activity, onClose, onSave }) => {
    // Lokale state voor het formulier
    const [formData, setFormData] = useState(activity);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let val = value;

        // Converteer numerieke inputs direct naar getallen
        if (type === 'number') {
            val = value === '' ? 0 : parseFloat(value);
        }

        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // Datum helper voor input type="date" (vereist YYYY-MM-DD)
    const dateValue = formData.date ? new Date(formData.date).toISOString().split('T')[0] : '';

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900 rounded-t-xl">
                    <h3 className="text-white font-bold flex items-center gap-2"><Edit2 size={18} className="text-yellow-400" /> Activiteit Bewerken</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BASIS GEGEVENS */}
                        <div className="col-span-2">
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Titel</label>
                            <input name="title" type="text" value={formData.title || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Datum</label>
                            <input name="date" type="date" value={dateValue} onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value).toISOString().split('T')[0] }))} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Type</label>
                            <select name="type" value={formData.type || 'Ride'} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none">
                                {SPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* METRICS */}
                        <div className="col-span-2 h-px bg-slate-700 my-2"></div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Afstand (km)</label>
                            <input name="distance" type="number" step="0.1" value={formData.distance || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Hoogtemeters (m)</label>
                            <input name="climbing" type="number" value={formData.climbing || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Tijd (sec)</label>
                            <input name="moving_time" type="number" value={formData.moving_time || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                            <span className="text-xs text-slate-500 text-right block mt-1">{formatTime(formData.moving_time)}</span>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Load (TSS)</label>
                            <input name="load" type="number" value={formData.load || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>

                        {/* POWER & HR */}
                        <div className="col-span-2 h-px bg-slate-700 my-2"></div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Avg Power (W)</label>
                            <input name="avg_power" type="number" value={formData.avg_power || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Max Power (W)</label>
                            <input name="max_power" type="number" value={formData.max_power || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Norm Power (NP)</label>
                            <input name="norm_power" type="number" value={formData.norm_power || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Work (kJ)</label>
                            <input name="work" type="number" value={formData.work || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Avg HR (bpm)</label>
                            <input name="avg_hr" type="number" value={formData.avg_hr || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Max HR (bpm)</label>
                            <input name="max_hr" type="number" value={formData.max_hr || 0} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:border-yellow-400 outline-none" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm">Annuleren</button>
                        <button type="submit" className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded shadow-lg shadow-yellow-500/20 flex items-center gap-2">
                            <Save size={16} /> Opslaan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- TABLE COMPONENTS (INTERN) ---
const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-yellow-400 inline" /> : <ChevronDown size={12} className="text-yellow-400 inline" />;
};

const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false }) => (
    <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md text-[0.7rem] tracking-wider">
        <tr>
            {isPreview && <th className="p-3 w-10"></th>}
            {ACTIVITY_COLUMNS.map((col) => (
                <th key={col.key} className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="p-3 text-right">Action</th>}
        </tr>
    </thead>
);

const Row = ({ act, onDelete, onEdit, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType }) => {
    if (!act) return null;

    const renderCell = (col) => {
        try {
            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-slate-600">-</span>;

            switch (col.key) {
                case 'date': return <span className="text-slate-300 whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
                case 'type': return (
                    <div
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => { if (isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); } }}
                        title={isPreview ? `Huidig: ${val}. Klik om te wijzigen.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={16} className="text-orange-400" title="Virtual Ride" /> :
                            val === 'Run' ? <Footprints size={16} className="text-blue-400" title="Run" /> :
                                val === 'Walk' ? <Footprints size={16} className="text-green-300" title="Walk" /> :
                                    val === 'Hike' ? <Mountain size={16} className="text-green-500" title="Hike" /> :
                                        <Bike size={16} className="text-green-400" title="Ride" />}
                    </div>
                );
                case 'title': return <span className="font-medium text-white block max-w-[200px] truncate" title={val}>{val}</span>;
                case 'moving_time': return <span className="text-slate-400 font-mono">{formatTime(val)}</span>;
                case 'distance': case 'avg_speed': return <span className="text-slate-400">{Number(val).toFixed(1)}</span>;
                case 'climbing': case 'avg_power': return <span className="text-slate-400">{Math.round(val || 0)}</span>;
                case 'norm_power': return <span className="font-bold text-yellow-400">{Math.round(val || 0)}</span>;
                case 'load': return <span className="font-bold text-blue-400">{Math.round(val || 0)}</span>;
                case 'rpe': return <span className="text-slate-400">{val || '-'}</span>;
                default: return <span className={`text-${col.text || 'slate-500'}`}>{val ? Math.round(val) : '-'}</span>;
            }
        } catch (e) {
            console.error("Error rendering cell", col.key, e);
            return <span className="text-red-500 text-xs">Err</span>;
        }
    };

    return (
        <tr className={`hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${isSelected ? 'bg-slate-700/30' : ''}`} onClick={onToggleSelect ? () => onToggleSelect(act.id) : undefined}>
            {isPreview && <td className="p-3 w-10"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align} text-xs ${col.width || ''}`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                {deleteConfirm === act.id ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(act.id) }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-slate-400 text-xs px-2 py-1">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-1 justify-end">
                        {/* EXTERNAL LINK */}
                        <a
                            href={`https://intervals.icu/activities/${act.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-600 hover:text-blue-400 p-1 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Intervals.icu"
                        >
                            <ExternalLink size={14} />
                        </a >
                        {/* EDIT BUTTON */}
                        < button onClick={(e) => { e.stopPropagation(); onEdit(act) }} className="text-slate-600 hover:text-yellow-400 p-1" >
                            <Edit2 size={14} />
                        </button >
                        {/* DELETE BUTTON */}
                        < button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id) }} className="text-slate-600 hover:text-red-400 p-1" >
                            <Trash2 size={14} />
                        </button >
                    </div >
                )}
            </td >}
        </tr >
    );
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
    const [showDebug, setShowDebug] = useState(false);
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
        // 1. Update Lokale State (zodat je meteen resultaat ziet)
        // We gebruiken onImport hier een beetje creatief: als we de hele lijst opnieuw meegeven aan de parent, zou dat werken,
        // maar de parent (App.jsx) verwacht 'nieuwe' items bij onImport.
        // BETER: We passen de activities lijst in App.jsx aan. Helaas hebben we geen 'onUpdate' prop gevraagd.
        // TRUC: We gebruiken de prop `onImport` met de geüpdatete lijst als we slim zijn, OF we geven gewoon een refresh.
        // Aangezien we in App.jsx `setActivities` hebben via onImport, werkt dat alleen voor toevoegen.

        // FIX: In Firebase updaten triggert de onSnapshot listener in App.jsx!
        // Dus we hoeven alleen maar naar Firebase te schrijven, en de App update zichzelf automatisch.

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
        const groups = {};
        activities.forEach(act => {
            if (!act.date) return;
            const day = act.date.split('T')[0];
            if (!groups[day]) groups[day] = [];
            groups[day].push(act);
        });

        const foundDups = [];
        Object.keys(groups).forEach(day => {
            const group = groups[day];
            if (group.length < 2) return;
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const a = group[i];
                    const b = group[j];
                    const timeA = new Date(a.date).getTime();
                    const timeB = new Date(b.date).getTime();
                    const diffMins = Math.abs(timeA - timeB) / 60000;
                    const distDiff = Math.abs((a.distance || 0) - (b.distance || 0));
                    const durDiff = Math.abs((a.moving_time || 0) - (b.moving_time || 0));

                    if (diffMins < 15 && (distDiff < 0.5 || durDiff < 60)) {
                        foundDups.push({ a, b, reason: `Starttijd verschil: ${Math.round(diffMins)}m, Afstand Δ: ${distDiff.toFixed(2)}km` });
                    }
                }
            }
        });

        if (foundDups.length > 0) {
            setDuplicates(foundDups);
            setShowDuplicateModal(true);
        } else {
            alert("Geen duplicaten gevonden! Je database is clean.");
        }
    };

    const resolveDuplicate = async (keepId, deleteId) => {
        await handleDeleteSingle(deleteId);
        setDuplicates(prev => prev.filter(d => d.a.id !== deleteId && d.b.id !== deleteId));
        if (duplicates.length <= 1) setShowDuplicateModal(false);
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

                    // Re-use authHeader defined above (scope check: need to pass it or redefine)
                    // It's safer to redefine or pull from variable if in scope.
                    // Since it's inside the same function scope, we can use `authHeader` if defined in correct scope.
                    // However, `authHeader` was defined inside the `try` block above.
                    // Let's redefine it here to be safe or move the definition up.
                    // To avoid scope issues let's just recalculate it simply.
                    const authHeader = 'Basic ' + btoa(`API_KEY:${intervalsConfig.apiKey}`);

                    try {
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
        onImport(toImport);

        if (db) {
            let savedCount = 0;
            try {
                for (const act of toImport) {
                    if (act.id) {
                        await setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
                        savedCount++;
                    }
                }
                console.log(`Saved ${savedCount} activities to Firebase`);
            } catch (e) {
                alert("Let op: Data lokaal geïmporteerd, maar Cloud backup mislukt: " + e.message);
            }
        }
        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
    };

    // Sorting & Filtering
    const processedActivities = useMemo(() => {
        if (!activities) return [];
        let filtered = activities.filter(a => {
            if (!isValidActivity(a)) return false;
            return (a.title && a.title.toLowerCase().includes(search.toLowerCase())) || (a.date && a.date.includes(search));
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
    }, [activities, search, sortConfig]);

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
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                        <div className="flex-shrink-0 p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                            <h3 className="font-bold text-white flex items-center gap-2 text-sm"><Download size={16} className="text-green-400" /> {fetchedActivities.length} Activities Found</h3>
                            <span className="text-xs text-slate-400 ml-auto mr-4">Select to Import or Update</span>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-700 rounded"><X size={18} className="text-slate-400 hover:text-white" /></button>
                        </div>
                        <div className="flex-shrink-0 px-3 py-2 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-2 items-center">
                            <button onClick={() => setSelectedActivities(fetchedActivities.map(r => r.id))} className="text-xs bg-slate-700 px-3 py-1.5 rounded text-white hover:bg-slate-600">Select All</button>
                            <button onClick={() => setSelectedActivities([])} className="text-xs bg-slate-700 px-3 py-1.5 rounded text-white hover:bg-slate-600">Deselect All</button>
                            <div className="w-px h-4 bg-slate-600 mx-1"></div>
                            <button onClick={() => { const withPower = fetchedActivities.filter(a => a.avg_power > 0 || a.norm_power > 0).map(a => a.id); setSelectedActivities(withPower); }} className="text-xs bg-emerald-600/30 border border-emerald-500/50 px-3 py-1.5 rounded text-emerald-300 hover:bg-emerald-600/50 flex items-center gap-1"><Zap size={12} /> Only With Power</button>
                        </div>
                        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <TableHeader config={previewSortConfig} requestSort={requestPreviewSort} hasActions={false} isPreview={true} />
                                <tbody className="divide-y divide-slate-700 bg-slate-800">
                                    {sortedFetchedActivities.map(act => (
                                        <Row key={act.id} act={act} isPreview={true} isSelected={selectedActivities.includes(act.id)} onToggleSelect={(id) => { if (selectedActivities.includes(id)) setSelectedActivities(s => s.filter(x => x !== id)); else setSelectedActivities(s => [...s, id]); }} onToggleType={toggleActivityTypeInPreview} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Footer - Restored */}
                        <div className="flex-shrink-0 p-3 border-t border-slate-700 flex justify-between items-center bg-slate-900">
                            <span className="text-xs text-slate-400">{selectedActivities.length} van {fetchedActivities.length} geselecteerd</span>
                            <div className="flex gap-2">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancel</button>
                                <button onClick={confirmImport} disabled={selectedActivities.length === 0} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg shadow-lg shadow-green-500/20 transition-all">✓ Import {selectedActivities.length}</button>
                            </div>
                        </div>

                        {/* DEBUG DATA */}
                        {rawData && (
                            <div className="border-t border-slate-700 bg-slate-900 p-2">
                                <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 w-full justify-center">
                                    <Info size={12} /> {showDebug ? 'Hide Debug Data' : 'Show Debug Data (Raw API Response)'}
                                </button>
                                {showDebug && (
                                    <pre className="mt-2 text-[10px] text-green-400 bg-black p-4 rounded overflow-auto max-h-60 font-mono select-text">
                                        {JSON.stringify(rawData, null, 2)}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* DUPLICATE RESOLUTION MODAL */}
            {
                showDuplicateModal && (
                    <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                            <div className="flex-shrink-0 p-4 border-b border-slate-700 bg-slate-900">
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                    <CopyPlus size={20} className="text-orange-400" />
                                    {duplicates.length} Conflicten Gevonden
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Vergelijk en kies welke activiteit je wilt behouden.</p>
                            </div>

                            <div className="overflow-auto flex-1 p-4 space-y-4 bg-slate-900/50">
                                {duplicates.map((dup, idx) => (
                                    <div key={idx} className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex flex-col gap-3">
                                        <div className="text-xs font-mono text-orange-300 bg-orange-900/20 px-2 py-1 rounded w-fit">
                                            {dup.reason}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* OPTIE A */}
                                            <div className="border border-slate-700 rounded p-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-white text-sm">Versie A</span>
                                                    <span className="text-xs text-slate-400">{dup.a.type}</span>
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-300">
                                                    <div className="font-medium text-white">{dup.a.title}</div>
                                                    <div>Date: {formatDateDDMMYYYY(dup.a.date)}</div>
                                                    <div>Dist: {dup.a.distance}km</div>
                                                    <div>Time: {formatTime(dup.a.moving_time)}</div>
                                                    <div>Power: {dup.a.avg_power}W</div>
                                                </div>
                                                <button onClick={() => resolveDuplicate(dup.a.id, dup.b.id)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded">Keep A (Delete B)</button>
                                            </div>

                                            {/* OPTIE B */}
                                            <div className="border border-slate-700 rounded p-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-white text-sm">Versie B</span>
                                                    <span className="text-xs text-slate-400">{dup.b.type}</span>
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-300">
                                                    <div className="font-medium text-white">{dup.b.title}</div>
                                                    <div>Date: {formatDateDDMMYYYY(dup.b.date)}</div>
                                                    <div>Dist: {dup.b.distance}km</div>
                                                    <div>Time: {formatTime(dup.b.moving_time)}</div>
                                                    <div>Power: {dup.b.avg_power}W</div>
                                                </div>
                                                <button onClick={() => resolveDuplicate(dup.b.id, dup.a.id)} className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded">Keep B (Delete A)</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-shrink-0 p-3 border-t border-slate-700 bg-slate-900 flex justify-end">
                                <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Sluiten (Later beslissen)</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* TABS */}
            <div className="flex border-b border-slate-700">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
                <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Sync (API)</button>
                <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Import (CSV/JSON)</button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <>
                        <div className="flex justify-between items-center mb-4 gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white outline-none" />
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

                        {!activities ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4"><Loader2 className="animate-spin text-yellow-400" size={32} /><p>Loading Activities...</p></div>
                        ) : processedActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 border border-dashed border-slate-700 rounded-lg"><AlertTriangle size={32} className="text-slate-600" /><p>No activities found. Start with an Import!</p></div>
                        ) : (
                            <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg custom-scrollbar">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <TableHeader config={sortConfig} requestSort={requestSort} hasActions={true} isPreview={false} />
                                    <tbody className="divide-y divide-slate-700 bg-slate-800">
                                        {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                                            <React.Fragment key={year}>
                                                <tr className="bg-slate-700/50"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="p-2 font-bold text-slate-300"><button onClick={() => toggleYear(year)} className="flex items-center gap-2">{expandedYears[year] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                                {expandedYears[year] && Object.keys(groupedActivities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                                    <React.Fragment key={month}>
                                                        <tr className="bg-slate-700/20"><td colSpan={ACTIVITY_COLUMNS.length + 1} className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500">{month}</td></tr>
                                                        {groupedActivities[year][month].map(act => <Row key={act.id} act={act} onDelete={handleDeleteSingle} onEdit={setEditingActivity} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        {!isGroupedView && processedActivities.map(act => <Row key={act.id} act={act} onDelete={handleDeleteSingle} onEdit={setEditingActivity} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {internalTab === 'intervals' && (
                    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6 space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><RefreshCw size={20} className="text-orange-400" /> Sync Activities</h3>
                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-xs text-blue-200 mb-4">
                            <strong>Tip:</strong> Sync in blokken van max 2-3 jaar om time-outs te voorkomen (bijv. 2014-2016, dan 2017-2019).
                        </div>
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
                            <button id="sync-btn" onClick={handleIntervalsSync} disabled={isSyncing} className="w-full py-3 rounded bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-lg shadow-orange-500/20">
                                {isSyncing ? (syncProgress || 'Syncing...') : 'Sync Now'}
                            </button>
                        </div>
                    </div>
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
                            <textarea className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white focus:border-yellow-400 outline-none transition-colors" placeholder="Plak de CSV tekst hier..." value={importText} onChange={e => setImportText(e.target.value)} />
                            <button onClick={handleManualImport} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold py-3 rounded shadow-lg shadow-yellow-400/20 transition-all">Verwerk Data (CSV of JSON)</button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default DataHub;