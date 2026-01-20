import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Bar 
} from 'recharts';
import { 
  Activity, Upload, TrendingUp, ChevronDown, ChevronRight, ChevronUp,
  Timer, Search, Zap, Mountain, Gauge, Brain, Battery, 
  Droplets, Utensils, Minus, Plus, Link as LinkIcon, Download,
  Map, Cloud, Trash2, AlertTriangle, Info, CheckCircle, ArrowUpDown, RefreshCw, X, Monitor, Bike, Footprints, Settings, Save
} from 'lucide-react';

// --- EXTERNE IMPORTS ---
import { CLIMB_DATABASE, COGGAN_ZONES } from './climbs'; 
import { db } from './firebase'; 
import { 
  smartParseCSV, calculateRollingTrend, formatDateDDMMYYYY, formatTime, 
  normalizeDate, determineActivityType 
} from './utils';
import { ACTIVITY_COLUMNS, SPORT_TYPES, MONTH_ORDER } from './config';

// --- FIREBASE FUNCTIES ---
// Let op: getDoc toegevoegd voor ophalen settings
import { collection, doc, setDoc, getDoc } from "firebase/firestore";

/**
 * ============================================================================
 * HELPER COMPONENTS
 * ============================================================================
 */

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />;
    return config.direction === 'asc' 
        ? <ChevronUp size={12} className="text-yellow-400 ml-1 inline" /> 
        : <ChevronDown size={12} className="text-yellow-400 ml-1 inline" />;
};

const TableHeader = ({ config, requestSort, hasActions = true }) => (
    <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md">
        <tr>
            {ACTIVITY_COLUMNS.map((col) => (
                <th 
                    key={col.key} 
                    className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${col.align} ${col.width || ''}`}
                    onClick={() => requestSort && requestSort(col.key)}
                >
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config}/>}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="p-3 text-right">Action</th>}
        </tr>
    </thead>
);

const Row = ({ act, onDelete, deleteConfirm, setDeleteConfirm, isPreview = false, isSelected = false, onToggleSelect, onToggleType }) => {
    const renderCell = (col) => {
        const val = act[col.key];

        switch(col.key) {
            case 'date': 
                return <span className="text-slate-300 whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
            case 'type':
                return (
                    <div 
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => {
                            if(isPreview && onToggleType) {
                                e.stopPropagation(); 
                                onToggleType(act.id);
                            }
                        }}
                        title={isPreview ? `Huidig: ${val}. Klik om te wijzigen.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={16} className="text-orange-400" title="Virtual Ride"/> :
                         val === 'Run' ? <Footprints size={16} className="text-blue-400" title="Run"/> :
                         val === 'Walk' ? <Footprints size={16} className="text-green-300" title="Walk"/> :
                         val === 'Hike' ? <Mountain size={16} className="text-green-500" title="Hike"/> :
                         <Bike size={16} className="text-green-400" title="Ride"/>}
                    </div>
                );
            case 'title':
                return <span className="font-medium text-white block max-w-[200px] truncate" title={val}>{val}</span>;
            case 'moving_time':
                return <span className="text-slate-400 font-mono">{formatTime(val)}</span>;
            case 'distance':
            case 'avg_speed':
                return <span className="text-slate-400">{Number(val).toFixed(1)}</span>;
            case 'climbing':
            case 'avg_power':
                return <span className="text-slate-400">{Math.round(val || 0)}</span>;
            case 'norm_power':
                return <span className="font-bold text-yellow-400">{Math.round(val || 0)}</span>;
            case 'load':
                return <span className="font-bold text-blue-400">{Math.round(val || 0)}</span>;
            case 'rpe':
                return <span className="text-slate-400">{val || '-'}</span>;
            default:
                return <span className={`text-${col.text || 'slate-500'}`}>{val ? Math.round(val) : '-'}</span>;
        }
    };

    return (
        <tr 
            className={`hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${isSelected ? 'bg-slate-700/30' : ''}`}
            onClick={onToggleSelect ? () => onToggleSelect(act.id) : undefined}
        >
            {isPreview && (
                <td className="p-3 w-10">
                    <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer"/>
                </td>
            )}
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align}`}>{renderCell(col)}</td>)}
            {!isPreview && (
                <td className="p-3 text-right">
                    {deleteConfirm === act.id ? (
                        <div className="flex gap-2 justify-end">
                            <button onClick={(e) => { e.stopPropagation(); onDelete(act.id); }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-slate-400 text-xs px-2 py-1">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(act.id); }} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 size={14}/>
                        </button>
                    )}
                </td>
            )}
        </tr>
    );
};

/**
 * ============================================================================
 * MAIN APPLICATION COMPONENTS
 * ============================================================================
 */

const PhysicsEngine = ({ userSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target'); 
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });
  const [countryFilter, setCountryFilter] = useState('All');

  const parseDuration = (str) => {
      if(!str) return 0;
      const parts = str.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
  };

  const updateWeight = (type, delta) => {
    // Let op: deze update logica zit eigenlijk in App, hier visualiseren we het resultaat
    // Omdat we geen 'setUserSettings' prop gebruiken in deze uitgeklede versie, 
    // ga ik er vanuit dat dit in een productie app via een context of prop callback gaat.
    // Voor nu visualiseren we de state.
  };

  useEffect(() => {
    if (!selectedClimb) return;
    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    
    const g = 9.81; const rho = 1.225; const cda = 0.32; const crr = 0.004; const loss = 0.03;

    let watts = 0, seconds = 0;

    if (mode === 'target') {
      seconds = parseDuration(targetTimeStr);
      if (seconds > 0) {
        const v = distance / seconds; 
        const F_g = totalWeight * g * Math.sin(Math.atan(grade));
        const F_r = totalWeight * g * Math.cos(Math.atan(grade)) * crr;
        const F_a = 0.5 * rho * cda * v * v;
        const P_wheel = (F_g + F_r + F_a) * v;
        watts = P_wheel / (1 - loss);
      }
    } else {
      watts = parseFloat(targetWatts);
      const P_wheel = watts * (1 - loss);
      const theta = Math.atan(grade);
      const K1 = 0.5 * rho * cda;
      const K2 = totalWeight * g * (Math.sin(theta) + crr * Math.cos(theta));
      let v = 3; 
      for(let i=0; i<10; i++) {
        const f = K1 * Math.pow(v, 3) + K2 * v - P_wheel;
        const df = 3 * K1 * Math.pow(v, 2) + K2;
        v = v - f / df;
      }
      seconds = v > 0 ? distance / v : 0;
    }

    const wkg = watts / userSettings.weight;
    const vam = seconds > 0 ? (elevation / seconds) * 3600 : 0;
    const zone = COGGAN_ZONES.find(z => (watts / userSettings.ftp) >= z.min && (watts / userSettings.ftp) <= z.max) || COGGAN_ZONES[6];

    setCalc({ 
        watts: Math.round(watts), 
        wkg: wkg.toFixed(2), 
        time: new Date(seconds * 1000).toISOString().substr(11, 8), 
        vam: Math.round(vam), 
        zone: zone 
    });

  }, [mode, targetTimeStr, targetWatts, selectedClimb, userSettings]);

  const filteredClimbs = useMemo(() => {
    if(countryFilter === 'All') return CLIMB_DATABASE;
    return CLIMB_DATABASE.filter(c => c.country === countryFilter);
  }, [countryFilter]);

  const climbsGrouped = useMemo(() => {
    const groups = {};
    filteredClimbs.forEach(c => {
      let key = c.country;
      if(c.country === 'Zwift') key = `Zwift - ${c.region}`; 
      if(!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredClimbs]);

  const uniqueCountries = useMemo(() => ['All', ...new Set(CLIMB_DATABASE.map(c => c.country))].sort(), []);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Mountain className="w-6 h-6" /> Physics Engine</h2>
            <a href={selectedClimb?.url || '#'} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs" title="View Info">
              <Info size={14}/> Climb Detail
            </a>
        </div>

        <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {uniqueCountries.map(c => (
                    <button 
                        key={c} 
                        onClick={() => setCountryFilter(c)}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${countryFilter === c ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        {c === 'All' ? '🌍 All' : c}
                    </button>
                ))}
            </div>
            
            <select 
              className="w-full bg-slate-900 text-white rounded p-3 text-sm border border-slate-600 outline-none focus:border-yellow-400"
              value={selectedClimb?.id || ''}
              onChange={(e) => onUpdateClimb(CLIMB_DATABASE.find(c => c.id === e.target.value))}
            >
              {Object.keys(climbsGrouped).sort().map(group => (
                <optgroup key={group} label={group}>
                  {climbsGrouped[group].map(c => <option key={c.id} value={c.id}>{c.name} ({c.lengthKm}km @ {c.avgGrade}%)</option>)}
                </optgroup>
              ))}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-700 rounded-lg p-1 flex">
                <button onClick={() => setMode('target')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode==='target'?'bg-yellow-400 text-slate-900':'text-slate-300'}`}>Target Time</button>
                <button onClick={() => setMode('predict')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode==='predict'?'bg-yellow-400 text-slate-900':'text-slate-300'}`}>Predict</button>
            </div>

            <div className="bg-slate-900 border border-yellow-400/30 p-4 rounded-lg">
                <label className="text-xs text-yellow-400 uppercase font-bold mb-2 block">{mode === 'target' ? 'Desired Time' : 'Sustainable Power'}</label>
                {mode === 'target' ? (
                   <input value={targetTimeStr} onChange={e => setTargetTimeStr(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-white outline-none border-b border-slate-700 focus:border-yellow-400" />
                ) : (
                   <input type="number" value={targetWatts} onChange={e => setTargetWatts(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-white outline-none border-b border-slate-700 focus:border-yellow-400" />
                )}
            </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 gap-4">
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Required Power</span>
                <span className="text-3xl font-bold text-white">{calc.watts} <small className="text-sm text-slate-500">W</small></span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Power / Weight</span>
                <span className="text-3xl font-bold text-yellow-400">{calc.wkg} <small className="text-sm text-yellow-600">W/kg</small></span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">Est. Time</span>
                <span className="text-3xl font-bold text-white font-mono">{calc.time}</span>
             </div>
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
                <span className="text-xs text-slate-400 uppercase mb-1">VAM</span>
                <span className="text-3xl font-bold text-white">{calc.vam} <small className="text-sm text-slate-500">m/h</small></span>
             </div>
             
             <div className="col-span-2 bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-white">Intensity Zone</span>
                    {calc.zone && <span style={{color: calc.zone.color}} className="font-bold text-sm uppercase">{calc.zone.name}</span>}
                </div>
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                    {COGGAN_ZONES.map((z, i) => (
                        <div key={i} style={{width: `${(z.max - z.min)/0.15 * 10}%`, background: z.color}} className="h-full opacity-30 hover:opacity-100 transition-opacity"></div>
                    ))}
                </div>
                <div className="relative w-full h-2 mt-1">
                     <div 
                        className="absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white transform -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${Math.min(Math.max((calc.watts/userSettings.ftp)/1.5 * 100, 0), 100)}%` }}
                     ></div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

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
  
  const [syncDates, setSyncDates] = useState({
      start: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0], 
      end: new Date().toISOString().split('T')[0] 
  });

  const [sportFilters, setSportFilters] = useState(
      SPORT_TYPES.reduce((acc, type) => ({...acc, [type]: true}), {})
  );

  const [fetchedActivities, setFetchedActivities] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // NIEUW: Laad settings uit Firebase bij opstarten
  useEffect(() => {
    const loadSettings = async () => {
        if (!db) return;
        try {
            const docRef = doc(db, "settings", "intervals");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIntervalsConfig({ apiKey: data.apiKey, athleteId: data.athleteId });
                // Update ook local storage voor fallback
                localStorage.setItem('intervals_api_key', data.apiKey);
                localStorage.setItem('intervals_athlete_id', data.athleteId);
            }
        } catch (e) {
            console.warn("Kon settings niet laden:", e);
        }
    };
    loadSettings();
  }, []);

  // NIEUW: Sla settings op in Firebase
  const saveSettingsToCloud = async () => {
      if (!db) { alert("Geen database verbinding"); return; }
      try {
          await setDoc(doc(db, "settings", "intervals"), intervalsConfig);
          alert("Instellingen veilig opgeslagen in de Cloud!");
      } catch (e) {
          alert("Fout bij opslaan: " + e.message);
      }
  };

  const updateIntervalsConfig = (key, val) => {
    setIntervalsConfig(prev => ({...prev, [key]: val}));
    localStorage.setItem(`intervals_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`, val);
  };

  const toggleSportFilter = (type) => setSportFilters(prev => ({...prev, [type]: !prev[type]}));
  const setAllSportFilters = (val) => setSportFilters(SPORT_TYPES.reduce((acc, type) => ({...acc, [type]: val}), {}));
  const toggleYear = (year) => setExpandedYears(p => ({...p, [year]: !p[year]}));
  
  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const handleImportCSV = (type) => {
    const data = smartParseCSV(importText, type);
    if(data.length) {
        setFetchedActivities(data);
        setSelectedActivities(data.map(r => r.id));
        setShowModal(true);
        setImportText(""); 
    } else { alert("Geen geldige data."); }
  };

  const handleSyncCloud = async () => {
    if (!db) { alert("Firebase Error: Db not initialized"); return; }
    const btn = document.getElementById('sync-btn');
    if(btn) { btn.innerHTML = 'Syncing...'; btn.disabled = true; }
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

  // --- INTERVALS API SYNC (MET TYPE DETECTIE) ---
  const handleIntervalsSync = async () => {
    if (!intervalsConfig.apiKey || !intervalsConfig.athleteId) {
        alert("Vul eerst je Athlete ID en API Key in.");
        return;
    }
    setIsSyncing(true);
    try {
        const response = await fetch(`https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?oldest=${syncDates.start}&newest=${syncDates.end}`, {
            headers: { 'Authorization': 'Basic ' + btoa('API_KEY:' + intervalsConfig.apiKey) }
        });
        if (!response.ok) throw new Error("API Fout: Check ID/Key");
        const data = await response.json();

        // 1. MAPPING + TYPE FIX + NaN FIX
        const mappedRides = data.map(ride => {
            const realType = determineActivityType(ride.type, ride.name);
            return {
                id: ride.id,
                date: ride.start_date_local.substring(0, 10),
                title: ride.name,
                type: realType, 
                moving_time: Number(ride.moving_time) || 0,
                distance: (Number(ride.distance) / 1000).toFixed(2), 
                climbing: Number(ride.total_elevation_gain) || 0,
                norm_power: Number(ride.icu_weighted_avg_watts) || 0,
                avg_power: Number(ride.average_watts) || 0,
                load: Number(ride.icu_training_load) || 0,
                rpe: Number(ride.icu_rpe) || 0,
                avg_speed: (Number(ride.average_speed) * 3.6).toFixed(1), 
                best_5min: 0, 
                best_20min: 0,
                best_60min: 0
            };
        });

        // 2. FILTERING
        const newRides = mappedRides
            .filter(ride => sportFilters[ride.type]) 
            .filter(ride => !activities.some(existing => existing.id === ride.id)); 

        if (newRides.length > 0) {
            setFetchedActivities(newRides);
            setSelectedActivities(newRides.map(r => r.id)); 
            setShowModal(true);
        } else {
            alert("Geen nieuwe ritten gevonden in deze selectie.");
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

  // --- HANDMATIGE TOGGLE IN IMPORT ---
  const toggleActivityTypeInPreview = (id) => {
      setFetchedActivities(prev => prev.map(act => {
          if (act.id === id) {
              const newType = act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide';
              return { ...act, type: newType };
          }
          return act;
      }));
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

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col relative">
        {/* === IMPORT MODAL === */}
        {showModal && (
            <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Download size={18} className="text-green-400"/> Found {fetchedActivities.length} Activities
                        </h3>
                        <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
                    </div>
                    
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex gap-4 items-center">
                        <button onClick={() => setSelectedActivities(fetchedActivities.map(r=>r.id))} className="text-xs bg-slate-700 px-3 py-1.5 rounded text-white hover:bg-slate-600">Select All</button>
                        <button onClick={() => setSelectedActivities([])} className="text-xs bg-slate-700 px-3 py-1.5 rounded text-white hover:bg-slate-600">Deselect All</button>
                        <span className="text-xs text-yellow-400 ml-auto flex items-center gap-1"><Info size={12}/> Klik icoon om te wisselen (Ride ↔ Virtual)</span>
                    </div>

                    <div className="overflow-auto flex-1 p-0">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <TableHeader config={{}} requestSort={null} hasActions={false} />
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {fetchedActivities.map(act => (
                                    <Row 
                                        key={act.id} 
                                        act={act} 
                                        isPreview={true} 
                                        isSelected={selectedActivities.includes(act.id)}
                                        onToggleSelect={(id) => {
                                            if(selectedActivities.includes(id)) setSelectedActivities(s => s.filter(x => x !== id));
                                            else setSelectedActivities(s => [...s, id]);
                                        }}
                                        onToggleType={toggleActivityTypeInPreview}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={confirmImport} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 text-white rounded shadow-lg shadow-green-500/20">
                            Import Selected ({selectedActivities.length})
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-700">
            <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
            <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Intervals.icu API</button>
            <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>CSV Import</button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {internalTab === 'log' && (
                <>
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
                            <TableHeader config={sortConfig} requestSort={requestSort} hasActions={true} />
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a,b)=> sortConfig.direction === 'asc' ? a-b : b-a).map(year => (
                                    <React.Fragment key={year}>
                                        <tr className="bg-slate-700/50">
                                            <td colSpan={ACTIVITY_COLUMNS.length + 1} className="p-2">
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
                                                    <td colSpan={ACTIVITY_COLUMNS.length + 1} className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">{month}</td>
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
            
            {internalTab === 'intervals' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings size={20} className="text-orange-400"/> Sync Configuration
                            </h3>
                            {/* Save Settings Button */}
                            <button 
                                onClick={saveSettingsToCloud}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded flex items-center gap-1"
                                title="Sla API Keys op in Firebase Cloud"
                            >
                                <Save size={12}/> Save to Cloud
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Search Period</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-slate-400 block mb-1">From</span>
                                    <input type="date" value={syncDates.start} onChange={e => setSyncDates(s => ({...s, start: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block mb-1">To</span>
                                    <input type="date" value={syncDates.end} onChange={e => setSyncDates(s => ({...s, end: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs uppercase font-bold text-slate-500">Activity Types</label>
                                <div className="space-x-2">
                                    <button onClick={() => setAllSportFilters(true)} className="text-[10px] text-blue-400 hover:text-white">Select All</button>
                                    <button onClick={() => setAllSportFilters(false)} className="text-[10px] text-blue-400 hover:text-white">None</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {SPORT_TYPES.map(type => (
                                    <label key={type} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${sportFilters[type] ? 'bg-orange-500/20 border-orange-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        <input type="checkbox" checked={sportFilters[type] || false} onChange={() => toggleSportFilter(type)} className="hidden" />
                                        {sportFilters[type] && <CheckCircle size={12} className="text-orange-400"/>}
                                        {type}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-700">
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Athlete ID</label>
                                <input type="text" placeholder="e.g. i12345" value={intervalsConfig.athleteId} onChange={e => updateIntervalsConfig('athleteId', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">API Key</label>
                                <input type="password" placeholder="Key" value={intervalsConfig.apiKey} onChange={e => updateIntervalsConfig('apiKey', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/>
                            </div>
                        </div>

                        <button onClick={handleIntervalsSync} disabled={isSyncing} className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${isSyncing ? 'bg-slate-700 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20'}`}>
                            {isSyncing ? <RefreshCw size={20} className="animate-spin"/> : <RefreshCw size={20}/>}
                            {isSyncing ? 'Connecting & Finding Activities...' : 'Sync Activities'}
                        </button>
                    </div>
                </div>
            )}
            
            {internalTab === 'import' && (
                <div className="space-y-4">
                     <textarea className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white" placeholder="Paste CSV here..." value={importText} onChange={e => setImportText(e.target.value)}/>
                    <button onClick={() => handleImportCSV('generic')} className="mt-4 w-full bg-yellow-400 text-slate-900 font-bold py-3 rounded">Import</button>
                </div>
            )}
        </div>
    </div>
  );
};

const ClimbProfileCard = ({ climb }) => {
    // Fail-safe voor als climb nog niet geladen is (voorkomt zwarte pagina crash)
    if (!climb) return <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full flex items-center justify-center text-slate-500">Select a climb...</div>;

    const sectors = [
        { name: 'Start', km: '0 - ' + (climb.lengthKm * 0.3).toFixed(1), grade: (climb.avgGrade * 0.8).toFixed(1), focus: 'Find rhythm, control HR' },
        { name: 'Middle', km: (climb.lengthKm * 0.3).toFixed(1) + ' - ' + (climb.lengthKm * 0.8).toFixed(1), grade: (climb.avgGrade * 1.1).toFixed(1), focus: 'Sweetspot power, aero posture' },
        { name: 'Finale', km: (climb.lengthKm * 0.8).toFixed(1) + ' - Top', grade: (climb.avgGrade * 1.2).toFixed(1), focus: 'Empty the tank, out of saddle' },
    ];

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Map className="text-yellow-400" size={20}/> Tactical Profile: {climb.name}
            </h3>
            
            <div className="flex gap-4 mb-6">
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Length</div>
                    <div className="text-xl font-bold text-white">{climb.lengthKm} km</div>
                 </div>
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Elevation</div>
                    <div className="text-xl font-bold text-white">{climb.elevation} m</div>
                 </div>
                 <div className="bg-slate-900 p-3 rounded flex-1 text-center">
                    <div className="text-xs text-slate-500 uppercase">Avg Grade</div>
                    <div className="text-xl font-bold text-yellow-400">{climb.avgGrade}%</div>
                 </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs uppercase text-slate-400 font-bold mb-2">Key Sectors</h4>
                {sectors.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded border-l-2 border-yellow-400">
                        <div>
                            <span className="text-white font-bold text-sm block">{s.name}</span>
                            <span className="text-xs text-slate-500">{s.km} km</span>
                        </div>
                        <div className="text-right">
                             <span className="text-yellow-400 font-bold block">{s.grade}%</span>
                             <span className="text-[10px] text-slate-400">{s.focus}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FuelingStrategy = () => {
    const [duration, setDuration] = useState(180); 
    const [intensity, setIntensity] = useState(0.85);
    const [bidonSize, setBidonSize] = useState(750);

    const requirements = useMemo(() => {
        const carbsPerHour = intensity > 0.9 ? 90 : intensity > 0.8 ? 75 : 60;
        const totalCarbs = (duration / 60) * carbsPerHour;
        const fluidPerHour = 600;
        const totalFluid = (duration / 60) * fluidPerHour;
        const totalBidons = Math.ceil(totalFluid / bidonSize); 
        const fluidCarbs = totalBidons * 40; 
        const remainingCarbs = Math.max(0, totalCarbs - fluidCarbs);
        const gels = Math.round((remainingCarbs * 0.6) / 30);
        const bars = Math.round((remainingCarbs * 0.4) / 45);

        return { carbsPerHour, totalCarbs, fluidPerHour, totalFluid, totalBidons, gels, bars };
    }, [duration, intensity, bidonSize]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Utensils className="text-green-400"/> Race Fueling Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Verwachte Duur</label>
                        <div className="flex items-center gap-4 mt-2">
                             <input type="range" min="30" max="600" step="15" value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="flex-1 accent-yellow-400"/>
                             <span className="w-20 font-mono text-white text-right">{Math.floor(duration/60)}h {duration%60}m</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Intensity Factor (IF)</label>
                        <div className="flex items-center gap-4 mt-2">
                             <input type="range" min="0.5" max="1.1" step="0.01" value={intensity} onChange={e=>setIntensity(parseFloat(e.target.value))} className="flex-1 accent-red-500"/>
                             <span className="w-20 font-mono text-white text-right">{(intensity*100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div>
                         <label className="text-xs text-slate-400 uppercase font-bold">Bidon Grootte</label>
                         <div className="flex bg-slate-900 rounded p-1 mt-2 w-fit">
                            <button onClick={()=>setBidonSize(500)} className={`px-4 py-1 text-xs rounded ${bidonSize===500 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>500ml</button>
                            <button onClick={()=>setBidonSize(750)} className={`px-4 py-1 text-xs rounded ${bidonSize===750 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>750ml</button>
                         </div>
                    </div>
                    
                    <div className="p-4 bg-slate-900 rounded border border-slate-700 mt-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-800 p-2 rounded">
                                <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{requirements.carbsPerHour}g</div>
                                <div className="text-[10px] text-slate-400">Carbs/hr</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{requirements.fluidPerHour}ml</div>
                                <div className="text-[10px] text-slate-400">Vocht/hr</div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <Battery className="w-4 h-4 text-green-400 mx-auto mb-1"/>
                                <div className="text-lg font-bold text-white">{Math.round(requirements.totalCarbs)}g</div>
                                <div className="text-[10px] text-slate-400">Total Load</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                         <h3 className="text-slate-300 font-bold mb-4 uppercase tracking-wider flex items-center gap-2"><CheckCircle size={16}/> Packing List</h3>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded text-blue-400"><Droplets size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.totalBidons}x</div>
                                        <div className="text-xs text-slate-400">Bidons ({bidonSize}ml) met Mix</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded text-yellow-400"><Zap size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.gels}x</div>
                                        <div className="text-xs text-slate-400">Energy Gels (30g)</div>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-500/20 p-2 rounded text-green-400"><Utensils size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.bars}x</div>
                                        <div className="text-xs text-slate-400">Solid Bars (45g)</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [userSettings, setUserSettings] = useState({
    weight: 70.0,
    bikeWeight: 7.5,
    ftp: 280,
    maxHr: 190
  });

  // VEILIGE INITIALISATIE: Voorkom crash als CLIMB_DATABASE nog leeg is (bij laden)
  const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE?.[0] || { id: 'default', name: 'Loading...', lengthKm: 0, elevation: 0, avgGrade: 0 });

  const [activities, setActivities] = useState([
    { id: '1', date: '2023-09-01', title: 'Base Miles', distance: 60, climbing: 400, norm_power: 200, avg_power: 180, load: 80, best_5min: 250, best_20min: 220, best_60min: 200, rpe: 4, moving_time: 7200, avg_speed: 30.0 },
    { id: '2', date: '2023-09-05', title: 'Intervals', distance: 45, climbing: 600, norm_power: 260, avg_power: 210, load: 110, best_5min: 350, best_20min: 280, best_60min: 220, rpe: 8, moving_time: 5400, avg_speed: 30.0 },
    { id: '3', date: '2023-10-12', title: 'Alpe Test', distance: 40, climbing: 1100, norm_power: 275, avg_power: 270, load: 130, best_5min: 310, best_20min: 295, best_60min: 270, rpe: 9, moving_time: 6000, avg_speed: 24.0 },
  ]);

  const [timeRange, setTimeRange] = useState('ALL');

  const chartData = useMemo(() => {
    let sorted = [...activities].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if(timeRange !== 'ALL') {
        const now = new Date();
        const months = timeRange === '6M' ? 6 : 12;
        const cutoff = new Date(now.setMonth(now.getMonth() - months));
        sorted = sorted.filter(a => new Date(a.date) >= cutoff);
    }

    return sorted.map(act => ({
        date: act.date,
        rawFtp: act.best_20min * 0.95,
        rollingFtp: calculateRollingTrend(activities, act.date, 'norm_power', 15), 
        load: act.load
    }));
  }, [activities, timeRange]);

  const totalLoad = activities.reduce((acc, c) => acc + (Number(c.load) || 0), 0);
  const avgLoad = activities.length > 0 ? Math.round(totalLoad / activities.length) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-400 selection:text-slate-900 pb-20">
      
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl italic shadow-lg shadow-yellow-500/20">CL</div>
             <div>
               <h1 className="font-bold text-white text-lg leading-tight">Climb Lab <span className="text-yellow-400 text-xs px-1 border border-yellow-400 rounded">ELITE</span></h1>
             </div>
           </div>
           <div className="flex gap-6 text-sm">
              <div className="hidden md:block">
                 <span className="text-slate-500 block text-[10px] uppercase">Sys. Weight</span>
                 <span className="text-white font-mono font-bold">{(userSettings.weight + userSettings.bikeWeight).toFixed(1)} kg</span>
              </div>
              <div className="hidden md:block">
                 <span className="text-slate-500 block text-[10px] uppercase">W/kg (FTP)</span>
                 <span className="text-yellow-400 font-mono font-bold">{(userSettings.ftp / userSettings.weight).toFixed(2)}</span>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <nav className="flex overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-hide">
           {[
             {id: 'dashboard', label: 'Dashboard', icon: Gauge},
             {id: 'physics', label: 'Physics Engine', icon: Mountain},
             {id: 'data', label: 'Data Hub', icon: Activity},
             {id: 'fueling', label: 'Fueling', icon: Utensils},
           ].map(item => (
             <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === item.id ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
             >
                <item.icon className="w-4 h-4"/> {item.label}
             </button>
           ))}
        </nav>

        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">FTP</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{userSettings.ftp}</span>
                                <span className="text-sm text-slate-500">W</span>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Weight</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-white">{userSettings.weight.toFixed(1)}</span>
                                <div className="flex gap-1">
                                    <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight-0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">-</button>
                                    <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight+0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">+</button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Load (Avg)</h3>
                            <span className="text-3xl font-bold text-blue-400">{avgLoad}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-yellow-400"/> FTP & Load</h3>
                            <div className="flex bg-slate-900 rounded p-1">
                                {['6M','1Y','ALL'].map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-xs font-bold rounded ${timeRange===r ? 'bg-yellow-400 text-slate-900' : 'text-slate-400'}`}>{r}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={d => d.substring(5)} />
                                    <YAxis yAxisId="left" stroke="#facc15" tick={{fontSize: 12}} domain={['dataMin - 20', 'auto']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" tick={{fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc'}}/>
                                    <Bar yAxisId="right" dataKey="load" fill="#3b82f6" opacity={0.3} barSize={20} name="TSS/Load" />
                                    <Area yAxisId="left" type="monotone" dataKey="rollingFtp" stroke="#facc15" strokeWidth={3} fillOpacity={0.1} fill="#facc15" name="Trend NP (15d)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                      </div>
                  </div>
                  
                  <div className="lg:col-span-1">
                     <ClimbProfileCard climb={selectedClimb} />
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />}
        {activeTab === 'data' && <DataHub activities={activities} onImport={(n) => setActivities([...activities, ...n])} onDelete={(id) => setActivities(activities.filter(a => a.id !== id))} />}
        {activeTab === 'fueling' && <FuelingStrategy />}
      </main>
    </div>
  );
};

export default App;