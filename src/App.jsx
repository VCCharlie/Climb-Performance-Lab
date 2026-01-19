import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Bar 
} from 'recharts';
import { 
  Activity, Upload, TrendingUp, ChevronDown, ChevronRight, ChevronUp,
  Timer, Search, Zap, Mountain, Gauge, Brain, Battery, 
  Droplets, Utensils, Minus, Plus, Link as LinkIcon, Download,
  Map, Cloud, Trash2, AlertTriangle, Info, CheckCircle, ArrowUpDown, RefreshCw, X, Monitor, Bike
} from 'lucide-react';

// --- IMPORTS ---
import { CLIMB_DATABASE, COGGAN_ZONES } from './climbs'; // Data
import { db } from './firebase'; // Config
import { 
  smartParseCSV, calculateRollingTrend, formatDateDDMMYYYY, formatTime, 
  normalizeDate 
} from './utils'; // Helper functies

// --- FIREBASE FUNCTIES ---
import { collection, doc, setDoc } from "firebase/firestore";

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * ============================================================================
 * 3. SUB-COMPONENTS (Kunnen later ook naar /components folder)
 * ============================================================================
 */

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  // ... (Code identiek aan vorige versie, alleen ingekort voor leesbaarheid hier) ...
  // In werkelijkheid behoud je hier de volledige logica van PhysicsEngine
  const [mode, setMode] = useState('target'); 
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });
  const [countryFilter, setCountryFilter] = useState('All');

  // ... (useEffects en render logica) ...
  // Voor nu even placeholder om de file niet te groot te maken in dit antwoord, 
  // maar in je echte file laat je dit staan zoals het was.
  return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="text-white">Physics Engine Module (Zie vorige code)</div>
      </div>
  )
};

// --- DATA HUB (GECORRIGEERD VOOR VIRTUAL RIDES) ---
const DataHub = ({ activities, onImport, onDelete }) => {
  const [internalTab, setInternalTab] = useState('log');
  const [importText, setImportText] = useState("");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); 
  const [expandedYears, setExpandedYears] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Intervals API State
  const [intervalsConfig, setIntervalsConfig] = useState({
    apiKey: localStorage.getItem('intervals_api_key') || '',
    athleteId: localStorage.getItem('intervals_athlete_id') || ''
  });
  const [fetchedActivities, setFetchedActivities] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const updateIntervalsConfig = (key, val) => {
    setIntervalsConfig(prev => ({...prev, [key]: val}));
    localStorage.setItem(`intervals_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`, val);
  };

  const handleImportCSV = (type) => {
    // Gebruikt nu de import uit utils.js
    const data = smartParseCSV(importText, type);
    if(data.length) {
      onImport(data);
      setImportText("");
      setInternalTab('log');
      alert(`Succes: ${data.length} activiteiten toegevoegd!`);
    } else {
        alert("Geen geldige data. Controleer de headers.");
    }
  };

  const handleSyncCloud = async () => {
    if (!db) { alert("Firebase Error"); return; }
    const btn = document.getElementById('sync-btn');
    if(btn) { btn.innerHTML = '↻ Syncing...'; btn.disabled = true; }
    try {
        let count = 0;
        for (const act of activities) {
            await setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
            count++;
        }
        alert(`Cloud Sync Voltooid! (${count} items)`);
    } catch (e) {
        alert("Sync Error: " + e.message);
    } finally {
        if(btn) { btn.innerHTML = 'Cloud Sync'; btn.disabled = false; }
    }
  };

  // --- INTERVALS API SYNC LOGIC ---
  const handleIntervalsSync = async () => {
    if (!intervalsConfig.apiKey || !intervalsConfig.athleteId) {
        alert("Vul eerst je Athlete ID en API Key in.");
        return;
    }
    setIsSyncing(true);
    
    // Calculate date range (Last 90 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startDateStr = startDate.toISOString().split('T')[0];

    try {
        const response = await fetch(`https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?oldest=${startDateStr}&newest=${endDate}`, {
            headers: {
                'Authorization': 'Basic ' + btoa('API_KEY:' + intervalsConfig.apiKey)
            }
        });

        if (!response.ok) throw new Error("API Fout: Check ID/Key");
        const data = await response.json();

        // Map Data
        const newRides = data
            .map(ride => ({
                id: ride.id,
                date: ride.start_date_local.substring(0, 10),
                title: ride.name,
                type: ride.type, // HIERRMEE PAKKEN WE HET TYPE (VirtualRide)
                moving_time: ride.moving_time,
                distance: (ride.distance / 1000).toFixed(2),
                climbing: ride.total_elevation_gain,
                norm_power: ride.icu_weighted_avg_watts || 0,
                avg_power: ride.average_watts || 0,
                load: ride.icu_training_load || 0,
                rpe: ride.icu_rpe || 0,
                avg_speed: (ride.average_speed * 3.6).toFixed(1),
                best_5min: 0, 
                best_20min: 0,
                best_60min: 0
            }))
            .filter(ride => !activities.some(existing => existing.id === ride.id)); 

        if (newRides.length > 0) {
            setFetchedActivities(newRides);
            setSelectedActivities(newRides.map(r => r.id)); 
            setShowModal(true);
        } else {
            alert("Geen nieuwe ritten gevonden.");
        }

    } catch (e) {
        alert("Sync mislukt: " + e.message);
    } finally {
        setIsSyncing(false);
    }
  };

  const confirmImport = () => {
    const toImport = fetchedActivities.filter(a => selectedActivities.includes(a.id));
    onImport(toImport);
    setShowModal(false);
    setFetchedActivities([]);
    setInternalTab('log');
  };

  // Toggle & Sort Logic (Ingekort voor overzicht, gebruik logica uit vorige App.jsx)
  const toggleYear = (year) => setExpandedYears(p => ({...p, [year]: !p[year]}));
  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const processedActivities = useMemo(() => {
    let filtered = activities.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()) || a.date.includes(search));
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

  const isGroupedView = sortConfig.key === 'date';
  const groupedActivities = useMemo(() => {
    if (!isGroupedView) return null;
    const groups = {};
    processedActivities.forEach(act => {
        const d = new Date(act.date);
        const y = d.getFullYear();
        const m = d.toLocaleString('en-US', { month: 'long' });
        if(!groups[y]) groups[y] = {};
        if(!groups[y][m]) groups[y][m] = [];
        groups[y][m].push(act);
    });
    return groups;
  }, [processedActivities, isGroupedView]);

  const Header = ({ label, colKey, align = 'left' }) => (
    <th className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${align}`} onClick={() => requestSort(colKey)}>
        <span className="flex items-center gap-1 justify-end">
             {align === 'left' && <span className="flex-1 text-left">{label}</span>}
             {align === 'left' ? <SortIcon colKey={colKey} config={sortConfig}/> : <>{label} <SortIcon colKey={colKey} config={sortConfig}/></>}
        </span>
    </th>
  );

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col relative">
        {/* SELECTION MODAL (Zelfde als vorige keer) */}
        {showModal && (
            <div className="absolute inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                {/* ... Modal content ... */}
                <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white flex items-center gap-2"><Download size={18} className="text-green-400"/> New Activities Found</h3>
                        <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setSelectedActivities(fetchedActivities.map(r=>r.id))} className="text-xs bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">Select All</button>
                            <button onClick={() => setSelectedActivities([])} className="text-xs bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">Deselect All</button>
                        </div>
                        <div className="space-y-2">
                            {fetchedActivities.map(ride => (
                                <div key={ride.id} className="flex items-center p-3 bg-slate-700/30 rounded border border-slate-700 hover:border-slate-500 cursor-pointer" onClick={() => {
                                    if(selectedActivities.includes(ride.id)) setSelectedActivities(s => s.filter(id => id !== ride.id));
                                    else setSelectedActivities(s => [...s, ride.id]);
                                }}>
                                    <input type="checkbox" checked={selectedActivities.includes(ride.id)} readOnly className="mr-3 w-4 h-4 accent-green-500"/>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                            {ride.type === 'VirtualRide' ? <Monitor size={14} className="text-orange-400"/> : <Bike size={14} className="text-green-400"/>}
                                            {ride.title}
                                        </div>
                                        <div className="text-xs text-slate-400">{ride.date} • {ride.distance}km • {ride.load} TSS</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-mono text-yellow-400 border border-yellow-400/20 px-1 rounded">{ride.norm_power}W NP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={confirmImport} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 text-white rounded shadow-lg shadow-green-500/20">
                            Import {selectedActivities.length} Activities
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex border-b border-slate-700">
            <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
            <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Intervals.icu API</button>
            <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>CSV Import</button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {internalTab === 'log' && (
                <>
                    {/* Header + Sync Button */}
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek op datum, naam..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-400 outline-none" />
                        </div>
                        <button id="sync-btn" onClick={handleSyncCloud} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap">
                            <Cloud size={16}/> Sync Cloud
                        </button>
                    </div>

                    <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <Header label="Date" colKey="date" align="left" />
                                    <th className="p-3">Type</th> {/* NIEUW: Type Kolom */}
                                    <Header label="Title" colKey="title" align="left" />
                                    <Header label="Time" colKey="moving_time" align="right" />
                                    <Header label="Dist" colKey="distance" align="right" />
                                    <Header label="Elev" colKey="climbing" align="right" />
                                    <Header label="Spd" colKey="avg_speed" align="right" />
                                    <Header label="NP" colKey="norm_power" align="right" />
                                    <Header label="Avg" colKey="avg_power" align="right" />
                                    <Header label="Load" colKey="load" align="right" />
                                    <Header label="RPE" colKey="rpe" align="right" />
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {/* HIER DE LOGICA VOOR GROUPED/FLAT VIEW (zelfde als voorheen, maar met nieuwe Row component) */}
                                {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a,b)=> sortConfig.direction === 'asc' ? a-b : b-a).map(year => (
                                    <React.Fragment key={year}>
                                        <tr className="bg-slate-700/50">
                                            <td colSpan="14" className="p-2">
                                                <button onClick={()=>toggleYear(year)} className="flex items-center gap-2 font-bold text-slate-300 w-full text-left">
                                                    {expandedYears[year] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {year}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedYears[year] && Object.keys(groupedActivities[year])
                                            .sort((a, b) => {
                                                const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
                                                return sortConfig.direction === 'asc' ? -diff : diff;
                                            })
                                            .map(month => (
                                            <React.Fragment key={month}>
                                                <tr className="bg-slate-700/20">
                                                    <td colSpan="14" className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">{month}</td>
                                                </tr>
                                                {groupedActivities[year][month].map(act => (
                                                    <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {!isGroupedView && processedActivities.map(act => (
                                     <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            
            {/* ... Intervals en Import tabs blijven hetzelfde ... */}
            {internalTab === 'intervals' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Connect Intervals.icu</h3>
                        {/* Inputs en Button... (zoals in vorige versie) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <input 
                                type="text" 
                                placeholder="Athlete ID (e.g. i12345)" 
                                value={intervalsConfig.athleteId}
                                onChange={e => updateIntervalsConfig('athleteId', e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            />
                            <input 
                                type="password" 
                                placeholder="API Key" 
                                value={intervalsConfig.apiKey}
                                onChange={e => updateIntervalsConfig('apiKey', e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded p-2 text-white"
                            />
                        </div>
                        <button onClick={handleIntervalsSync} disabled={isSyncing} className="bg-orange-500 text-white w-full py-3 rounded font-bold">
                            {isSyncing ? 'Syncing...' : 'Sync Last 90 Days'}
                        </button>
                    </div>
                </div>
            )}
            
            {internalTab === 'import' && (
                <div className="space-y-4">
                     <textarea 
                        className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white"
                        placeholder="Paste CSV here..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                    />
                    <button onClick={() => handleImportCSV('generic')} className="mt-4 w-full bg-yellow-400 text-slate-900 font-bold py-3 rounded">Import</button>
                </div>
            )}
        </div>
    </div>
  );
};

const Row = ({ act, onDelete, deleteConfirm, setDeleteConfirm }) => (
    <tr className="hover:bg-slate-700/50 transition-colors border-b border-slate-700/50">
        <td className="p-3 text-slate-300">{formatDateDDMMYYYY(act.date)}</td>
        <td className="p-3 text-center">
            {/* Icoontje op basis van Type */}
            {act.type === 'VirtualRide' 
                ? <Monitor size={16} className="text-orange-400 mx-auto" title="Virtual Ride (Zwift)"/> 
                : <Bike size={16} className="text-green-400 mx-auto" title="Outdoor Ride"/>
            }
        </td>
        <td className="p-3 font-medium text-white max-w-[150px] truncate" title={act.title}>{act.title}</td>
        <td className="p-3 text-right text-slate-400">{formatTime(act.moving_time)}</td>
        <td className="p-3 text-right text-slate-400">{parseFloat(act.distance).toFixed(1)}</td>
        <td className="p-3 text-right text-slate-400">{Math.round(act.climbing || 0)}</td>
        <td className="p-3 text-right text-slate-400">{act.avg_speed ? parseFloat(act.avg_speed).toFixed(1) : '-'}</td>
        <td className="p-3 text-right font-bold text-yellow-400">{Math.round(act.norm_power || 0)}</td>
        <td className="p-3 text-right text-slate-400">{Math.round(act.avg_power || 0)}</td>
        <td className="p-3 text-right text-blue-400">{Math.round(act.load || 0)}</td>
        <td className="p-3 text-right text-slate-400">{act.rpe || '-'}</td>
        <td className="p-3 text-right">
            {deleteConfirm === act.id ? (
                <div className="flex gap-2 justify-end">
                    <button onClick={() => onDelete(act.id)} className="text-red-500 font-bold text-xs">SURE?</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 text-xs">Cancel</button>
                </div>
            ) : (
                <button onClick={() => setDeleteConfirm(act.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14}/>
                </button>
            )}
        </td>
    </tr>
);

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />;
    return config.direction === 'asc' 
        ? <ChevronUp size={12} className="text-yellow-400 ml-1 inline" /> 
        : <ChevronDown size={12} className="text-yellow-400 ml-1 inline" />;
};

// ... App Component, FuelingStrategy en ClimbProfileCard zijn onveranderd ...
// Zorg dat je de nieuwe imports bovenaan gebruikt!

const App = () => {
    // ... Standaard App implementatie ...
    // Maar zorg dat PhysicsEngine nu CLIMB_DATABASE gebruikt uit de import
    // <PhysicsEngine selectedClimb={selectedClimb} ... />
    
    // Voorbeeld van minimale App render ter illustratie (gebruik volledige code uit context):
    const [activeTab, setActiveTab] = useState('dashboard');
    const [userSettings, setUserSettings] = useState({ weight: 70, bikeWeight: 7.5, ftp: 280, maxHr: 190 });
    const [activities, setActivities] = useState([]); // Initialiseer leeg of met data
    // ...
    
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
             {/* Header */}
             <main className="max-w-7xl mx-auto p-4 space-y-6">
                {/* Tabs */}
                {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={CLIMB_DATABASE[0]} onUpdateClimb={()=>{}} />}
                {activeTab === 'data' && <DataHub activities={activities} onImport={(n) => setActivities([...activities, ...n])} onDelete={(id) => setActivities(activities.filter(a => a.id !== id))} />}
             </main>
        </div>
    )
}

export default App;