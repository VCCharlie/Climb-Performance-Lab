import React, { useState, useMemo } from 'react';
import { 
  Search, Cloud, Download, Info, RefreshCw, X, Monitor, Bike, Footprints, Settings, 
  ArrowUpDown, ChevronUp, ChevronDown, Trash2, CheckCircle, Mountain // <--- Mountain toegevoegd voor Hike
} from 'lucide-react';
import { doc, setDoc } from "firebase/firestore";
import { db } from '../firebase';
import { smartParseCSV, formatDateDDMMYYYY, formatTime, determineActivityType } from '../utils';
import { ACTIVITY_COLUMNS, SPORT_TYPES, MONTH_ORDER } from '../config';

// --- TABLE COMPONENTS (INTERN) ---
const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-yellow-400 ml-1 inline" /> : <ChevronDown size={12} className="text-yellow-400 ml-1 inline" />;
};

const TableHeader = ({ config, requestSort, hasActions = true }) => (
    <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-md">
        <tr>
            {ACTIVITY_COLUMNS.map((col) => (
                <th key={col.key} className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
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
            case 'date': return <span className="text-slate-300 whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
            case 'type': return (
                    <div 
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => { if(isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); }}}
                        title={isPreview ? `Huidig: ${val}. Klik om te wijzigen.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={16} className="text-orange-400" title="Virtual Ride"/> :
                         val === 'Run' ? <Footprints size={16} className="text-blue-400" title="Run"/> :
                         val === 'Walk' ? <Footprints size={16} className="text-green-300" title="Walk"/> :
                         val === 'Hike' ? <Mountain size={16} className="text-green-500" title="Hike"/> :
                         <Bike size={16} className="text-green-400" title="Ride"/>}
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
    };
    return (
        <tr className={`hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${isSelected ? 'bg-slate-700/30' : ''}`} onClick={onToggleSelect ? () => onToggleSelect(act.id) : undefined}>
            {isPreview && <td className="p-3 w-10"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer"/></td>}
            {ACTIVITY_COLUMNS.map(col => <td key={col.key} className={`p-3 text-${col.align}`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="p-3 text-right">
                {deleteConfirm === act.id ? <div className="flex gap-2 justify-end"><button onClick={(e)=>{e.stopPropagation();onDelete(act.id)}} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button><button onClick={(e)=>{e.stopPropagation();setDeleteConfirm(null)}} className="text-slate-400 text-xs px-2 py-1">Cancel</button></div> : <button onClick={(e)=>{e.stopPropagation();setDeleteConfirm(act.id)}} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>}
            </td>}
        </tr>
    );
};

// --- MAIN COMPONENT ---
const DataHub = ({ activities, onImport, onDelete, intervalsConfig }) => {
  const [internalTab, setInternalTab] = useState('log');
  const [importText, setImportText] = useState("");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); 
  const [expandedYears, setExpandedYears] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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

  // Logic
  const toggleSportFilter = (type) => setSportFilters(prev => ({...prev, [type]: !prev[type]}));
  const setAllSportFilters = (val) => setSportFilters(SPORT_TYPES.reduce((acc, type) => ({...acc, [type]: val}), {}));
  const toggleYear = (year) => setExpandedYears(p => ({...p, [year]: !p[year]}));
  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });

  const toggleActivityTypeInPreview = (id) => {
      setFetchedActivities(prev => prev.map(act => {
          if (act.id === id) {
              const newType = act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide';
              return { ...act, type: newType };
          }
          return act;
      }));
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

  const handleIntervalsSync = async () => {
    if (!intervalsConfig.apiKey || !intervalsConfig.athleteId) {
        alert("Geen API gegevens gevonden. Ga naar de Settings tab om deze in te vullen.");
        return;
    }
    setIsSyncing(true);
    try {
        const response = await fetch(`https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?oldest=${syncDates.start}&newest=${syncDates.end}`, {
            headers: { 'Authorization': 'Basic ' + btoa('API_KEY:' + intervalsConfig.apiKey) }
        });
        if (!response.ok) throw new Error("API Fout: Check ID/Key in Settings");
        const data = await response.json();

        // FIX: Robuustere mapping. Intervals API velden kunnen variëren (bijv. icu_weighted_avg_watts vs weighted_average_watts)
        const mappedRides = data.map(ride => {
            const realType = determineActivityType(ride.type, ride.name);
            
            // Safe conversions om NaN te voorkomen
            const movingTime = Number(ride.moving_time || 0);
            const distMeters = Number(ride.distance || 0);
            const avgSpeedMs = Number(ride.average_speed || 0);

            return {
                id: ride.id,
                date: ride.start_date_local.substring(0, 10),
                title: ride.name,
                type: realType, 
                moving_time: movingTime,
                distance: (distMeters / 1000).toFixed(2), 
                climbing: Number(ride.total_elevation_gain || 0),
                // Fallback mechanisme voor vermogen en load
                norm_power: Number(ride.icu_weighted_avg_watts || ride.weighted_average_watts || 0),
                avg_power: Number(ride.average_watts || ride.avg_power || 0),
                load: Number(ride.icu_training_load || ride.training_load || 0),
                rpe: Number(ride.icu_rpe || ride.rpe || 0),
                avg_speed: (avgSpeedMs * 3.6).toFixed(1), 
                best_5min: 0, best_20min: 0, best_60min: 0
            };
        });

        const newRides = mappedRides
            .filter(ride => sportFilters[ride.type]) 
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
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col relative animate-in fade-in">
        {/* MODAL */}
        {showModal && (
            <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white flex items-center gap-2"><Download size={18} className="text-green-400"/> Found {fetchedActivities.length} Activities</h3>
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
                                        onToggleSelect={(id) => { if(selectedActivities.includes(id)) setSelectedActivities(s => s.filter(x => x !== id)); else setSelectedActivities(s => [...s, id]); }}
                                        onToggleType={toggleActivityTypeInPreview}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={confirmImport} className="px-6 py-2 text-sm font-bold bg-green-500 hover:bg-green-400 text-white rounded shadow-lg shadow-green-500/20">Import Selected</button>
                    </div>
                </div>
            </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-700">
            <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
            <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Sync (API)</button>
            <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Import (CSV)</button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {internalTab === 'log' && (
                <>
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white outline-none" />
                        </div>
                        <button id="sync-btn" onClick={handleSyncCloud} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all"><Cloud size={16}/> Sync Cloud</button>
                    </div>
                    <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <TableHeader config={sortConfig} requestSort={requestSort} hasActions={true} />
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {isGroupedView && groupedActivities && Object.keys(groupedActivities).sort((a,b)=> sortConfig.direction === 'asc' ? a-b : b-a).map(year => (
                                    <React.Fragment key={year}>
                                        <tr className="bg-slate-700/50"><td colSpan={ACTIVITY_COLUMNS.length+1} className="p-2 font-bold text-slate-300"><button onClick={()=>toggleYear(year)} className="flex items-center gap-2">{expandedYears[year] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {year}</button></td></tr>
                                        {expandedYears[year] && Object.keys(groupedActivities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                            <React.Fragment key={month}>
                                                <tr className="bg-slate-700/20"><td colSpan={ACTIVITY_COLUMNS.length+1} className="px-8 py-1 text-[10px] uppercase font-bold text-slate-500">{month}</td></tr>
                                                {groupedActivities[year][month].map(act => <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>)}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {!isGroupedView && processedActivities.map(act => <Row key={act.id} act={act} onDelete={onDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}/>)}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            
            {internalTab === 'intervals' && (
                <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6 space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><RefreshCw size={20} className="text-orange-400"/> Sync Activities</h3>
                    
                    {/* Datum Selectors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs text-slate-400 block mb-1">From</span><input type="date" value={syncDates.start} onChange={e => setSyncDates(s => ({...s, start: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/></div>
                        <div><span className="text-xs text-slate-400 block mb-1">To</span><input type="date" value={syncDates.end} onChange={e => setSyncDates(s => ({...s, end: e.target.value}))} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"/></div>
                    </div>
                    
                    {/* Sport Filters */}
                    <div>
                        <div className="flex justify-between mb-2"><label className="text-xs uppercase font-bold text-slate-500">Types</label><div className="space-x-2"><button onClick={() => setAllSportFilters(true)} className="text-[10px] text-blue-400">All</button><button onClick={() => setAllSportFilters(false)} className="text-[10px] text-blue-400">None</button></div></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {SPORT_TYPES.map(type => (
                                <label key={type} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer border ${sportFilters[type] ? 'bg-orange-500/20 border-orange-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <input type="checkbox" checked={sportFilters[type] || false} onChange={() => toggleSportFilter(type)} className="hidden" />
                                    {sportFilters[type] && <CheckCircle size={12} className="text-orange-400"/>} {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <button onClick={handleIntervalsSync} disabled={isSyncing} className="w-full py-3 rounded bg-orange-500 hover:bg-orange-600 text-white font-bold">{isSyncing ? 'Syncing...' : 'Sync Now'}</button>
                        <p className="text-xs text-center text-slate-500 mt-2">Credentials configured in Settings tab</p>
                    </div>
                </div>
            )}

            {internalTab === 'import' && (
                <div className="space-y-4">
                     <textarea className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white" placeholder="Paste CSV here..." value={importText} onChange={e => setImportText(e.target.value)}/>
                    <button onClick={() => handleImportCSV('generic')} className="mt-4 w-full bg-yellow-400 text-slate-900 font-bold py-3 rounded">Import CSV</button>
                </div>
            )}
        </div>
    </div>
  );
};

export default DataHub;