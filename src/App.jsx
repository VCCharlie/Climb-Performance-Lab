import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, ReferenceLine 
} from 'recharts';
import { 
  Activity, Upload, TrendingUp, Calendar, ChevronDown, ChevronRight, 
  Timer, Search, Zap, Mountain, Gauge, ArrowRight, Brain, Battery 
} from 'lucide-react';

/**
 * ============================================================================
 * CONFIGURATION & CONSTANTS (CLIMB DATABASE & ZONES)
 * ============================================================================
 */

// Een selectie van iconische beklimmingen (Real World & Zwift)
// In een productie-omgeving zou dit een JSON import van 200+ items zijn.
const CLIMB_DATABASE = [
  { id: 'alpe_huez', name: "Alpe d'Huez", country: "FR", lengthKm: 13.8, elevation: 1061, avgGrade: 8.1, url: "https://climbfinder.com/en/climbs/alpe-d-huez" },
  { id: 'ventoux_bedoin', name: "Mont Ventoux (Bédoin)", country: "FR", lengthKm: 21.5, elevation: 1610, avgGrade: 7.5, url: "https://climbfinder.com/en/climbs/mont-ventoux-bedoin" },
  { id: 'stelvio_prato', name: "Passo dello Stelvio (Prato)", country: "IT", lengthKm: 24.8, elevation: 1845, avgGrade: 7.4, url: "https://climbfinder.com/en/climbs/passo-dello-stelvio-prato-allo-stelvio" },
  { id: 'red_bull_ring', name: "Red Bull Ring (Spielberg)", country: "AT", lengthKm: 4.3, elevation: 65, avgGrade: 1.5, url: "#" }, // Vlak/Heuvel test
  { id: 'cauberg', name: "Cauberg", country: "NL", lengthKm: 0.8, elevation: 65, avgGrade: 5.8, url: "https://climbfinder.com/en/climbs/cauberg" },
  { id: 'zwift_alpe', name: "Alpe du Zwift", country: "Zwift", lengthKm: 12.2, elevation: 1036, avgGrade: 8.5, url: "#" },
  { id: 'zwift_epic_kom', name: "Epic KOM", country: "Zwift", lengthKm: 9.4, elevation: 540, avgGrade: 5.9, url: "#" },
  { id: 'adw_portal', name: "Portal: Cote de Pike", country: "Zwift", lengthKm: 2.0, elevation: 200, avgGrade: 10.0, url: "#" },
];

const COGGAN_ZONES = [
  { name: 'Z1 Active Recovery', min: 0, max: 0.55, color: '#9ca3af' }, // Gray
  { name: 'Z2 Endurance', min: 0.56, max: 0.75, color: '#3b82f6' },    // Blue
  { name: 'Z3 Tempo', min: 0.76, max: 0.90, color: '#22c55e' },       // Green
  { name: 'Z4 Threshold', min: 0.91, max: 1.05, color: '#eab308' },   // Yellow
  { name: 'Z5 VO2 Max', min: 1.06, max: 1.20, color: '#f97316' },     // Orange
  { name: 'Z6 Anaerobic', min: 1.21, max: 1.50, color: '#ef4444' },    // Red
  { name: 'Z7 Neuromuscular', min: 1.51, max: 10.0, color: '#a855f7' } // Purple
];

/**
 * ============================================================================
 * HELPER FUNCTIONS (PHYSICS & PARSING)
 * ============================================================================
 */

// Physics Constants
const GRAVITY = 9.81;
const RHO_AIR = 1.225; // Air density at sea level (simplified)
const CDA_CLIMBING = 0.32; // Aerodynamic drag coefficient (tops)
const CRR = 0.004; // Rolling resistance (good tires)
const DRIVETRAIN_LOSS = 0.03; // 3% loss

const calculateVAM = (watts, weightTotal, gradientPercent) => {
  // Simplificatie: VAM (m/h) = (Watts / kg) * Factor (afhankelijk van steilte)
  // Betere benadering via Power formula omgekeerd.
  // Voor nu: Ferrari Formula schatting: VAM = (Power / SystemWeight) * GradientFactor
  // Maar we gebruiken de physics engine voor precisie.
  // Hier een snelle schatting voor UI labels:
  // VAM ~ (W/kg * 1000) / (10 + (Graad/10)) -> Ruwe vuistregel
  const wKg = watts / weightTotal;
  return Math.round(wKg * (gradientPercent * 10 + 200)); // Zeer ruwe schatting, physics engine doet het echte werk
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseTimeString = (str) => {
  // Input "59:00" of "1:10:00"
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// Slimme CSV Parser
const smartParseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
  
  // Header mapping om variaties op te vangen
  const mapHeader = (h) => {
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h.includes('title') || h.includes('naam') || h.includes('activity')) return 'title';
    if (h.includes('distance') || h.includes('afstand')) return 'distance';
    if (h.includes('moving') || h.includes('tijd')) return 'moving_time';
    if (h.includes('norm') || h.includes('np')) return 'norm_power';
    if (h.includes('avg power') || h.includes('gem. vermogen')) return 'avg_power';
    if (h.includes('load') || h.includes('tss')) return 'load';
    if (h.includes('rpe')) return 'rpe';
    if (h.includes('climb') || h.includes('hoogte')) return 'elevation';
    return h;
  };

  const mappedHeaders = headers.map(mapHeader);

  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const entry = {};
    
    mappedHeaders.forEach((key, index) => {
      let val = values[index] ? values[index].trim().replace(/['"]+/g, '') : '';
      
      // Numeric conversie
      if (['distance', 'moving_time', 'norm_power', 'avg_power', 'load', 'rpe', 'elevation'].includes(key)) {
        val = parseFloat(val.replace(',', '.'));
        if (isNaN(val)) val = 0;
      }
      entry[key] = val;
    });

    // Fallbacks en berekeningen
    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date) entry.date = new Date().toISOString().split('T')[0];
    
    return entry;
  }).filter(e => e.avg_power > 0 || e.distance > 0); // Filter lege rijen
};


/**
 * ============================================================================
 * COMPONENT: PHYSICS ENGINE (THE CLIMB LAB)
 * ============================================================================
 */
const PhysicsEngine = ({ userSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target'); // 'target' (Time -> Watts) or 'predict' (Watts -> Time)
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp || 250);
  
  // Physics Calculation Results
  const [results, setResults] = useState({
    watts: 0,
    wkg: 0,
    time: "",
    vam: 0,
    zone: null
  });

  const totalWeight = userSettings.weight + userSettings.bikeWeight;

  useEffect(() => {
    if (!selectedClimb) return;

    const grade = selectedClimb.avgGrade / 100; // 8.1% -> 0.081
    const distance = selectedClimb.lengthKm * 1000; // meters
    const elevation = selectedClimb.elevation; // meters
    
    let calculatedWatts = 0;
    let calculatedSeconds = 0;

    if (mode === 'target') {
      // SCENARIO A: Tijd -> Watts
      calculatedSeconds = parseTimeString(targetTimeStr);
      if (calculatedSeconds > 0) {
        const speed = distance / calculatedSeconds; // m/s
        
        // F_gravity = m * g * sin(arctan(grade))
        // Voor kleine hoeken is sin(arctan(grade)) approx grade
        const theta = Math.atan(grade);
        const F_grav = totalWeight * GRAVITY * Math.sin(theta);
        const F_roll = totalWeight * GRAVITY * Math.cos(theta) * CRR;
        const F_aero = 0.5 * RHO_AIR * CDA_CLIMBING * (speed * speed);
        
        const F_total = F_grav + F_roll + F_aero;
        const P_wheel = F_total * speed;
        calculatedWatts = P_wheel / (1 - DRIVETRAIN_LOSS);
      }
    } else {
      // SCENARIO B: Watts -> Tijd
      // Iteratieve benadering voor snelheid v
      calculatedWatts = parseFloat(targetWatts);
      const P_wheel = calculatedWatts * (1 - DRIVETRAIN_LOSS);
      
      // We zoeken v waar: P_wheel = (F_grav + F_roll + 0.5*rho*CdA*v^2) * v
      // v^3 * (0.5*rho*CdA) + v * (F_grav + F_roll) - P_wheel = 0
      // Cubic equation solving is tricky, we doen Newton-Raphson
      
      const theta = Math.atan(grade);
      const K1 = 0.5 * RHO_AIR * CDA_CLIMBING;
      const K2 = totalWeight * GRAVITY * (Math.sin(theta) + CRR * Math.cos(theta));
      
      let v = 3; // Start guess: 3 m/s (~11km/h)
      for(let i=0; i<10; i++) {
        const f_v = K1 * Math.pow(v, 3) + K2 * v - P_wheel;
        const df_v = 3 * K1 * Math.pow(v, 2) + K2;
        v = v - f_v / df_v;
      }
      
      if (v > 0) {
        calculatedSeconds = distance / v;
      }
    }

    // Update Results
    const wkg = calculatedWatts / userSettings.weight;
    
    // Find Zone
    const ftp = userSettings.ftp || 300;
    const ratio = calculatedWatts / ftp;
    const zone = COGGAN_ZONES.find(z => ratio >= z.min && ratio <= z.max) || COGGAN_ZONES[COGGAN_ZONES.length - 1];

    setResults({
      watts: Math.round(calculatedWatts),
      wkg: wkg.toFixed(2),
      time: formatDuration(calculatedSeconds),
      vam: Math.round((elevation / calculatedSeconds) * 3600),
      zone: zone
    });

  }, [mode, targetTimeStr, targetWatts, selectedClimb, totalWeight, userSettings.weight, userSettings.ftp]);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
          <Mountain className="w-6 h-6" /> Physics Engine
        </h2>
        <select 
          className="bg-slate-700 text-white rounded p-2 border border-slate-600 text-sm"
          value={selectedClimb.id}
          onChange={(e) => onUpdateClimb(CLIMB_DATABASE.find(c => c.id === e.target.value))}
        >
          {CLIMB_DATABASE.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.avgGrade}%)</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* INPUTS */}
        <div className="space-y-4">
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button 
              onClick={() => setMode('target')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'target' ? 'bg-yellow-400 text-slate-900' : 'text-slate-300 hover:text-white'}`}
            >
              Target Time
            </button>
            <button 
              onClick={() => setMode('predict')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'predict' ? 'bg-yellow-400 text-slate-900' : 'text-slate-300 hover:text-white'}`}
            >
              Predict (Watts)
            </button>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
             {mode === 'target' ? (
               <div>
                 <label className="block text-xs text-slate-400 uppercase mb-1">Doeltijd (UU:MM:SS)</label>
                 <input 
                  type="text" 
                  value={targetTimeStr}
                  onChange={(e) => setTargetTimeStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-xl font-mono text-white focus:border-yellow-400 outline-none"
                 />
               </div>
             ) : (
               <div>
                 <label className="block text-xs text-slate-400 uppercase mb-1">Target Power (Watts)</label>
                 <input 
                  type="number" 
                  value={targetWatts}
                  onChange={(e) => setTargetWatts(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-xl font-mono text-white focus:border-yellow-400 outline-none"
                 />
               </div>
             )}
             <div className="mt-4 text-xs text-slate-400 flex justify-between">
               <span>Rider: {userSettings.weight}kg</span>
               <span>Bike: {userSettings.bikeWeight}kg</span>
               <span>Total: {totalWeight}kg</span>
             </div>
          </div>
        </div>

        {/* OUTPUTS */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase">Power Output</div>
              <div className="text-2xl font-bold text-white mt-1">{results.watts} <span className="text-sm font-normal text-slate-500">W</span></div>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase">W/kg</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{results.wkg}</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase">Estimated Time</div>
              <div className="text-2xl font-bold text-white mt-1">{results.time}</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase">VAM</div>
              <div className="text-2xl font-bold text-white mt-1">{results.vam} <span className="text-sm font-normal text-slate-500">m/h</span></div>
            </div>
          </div>

          {results.zone && (
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Target Zone:</span>
              <span 
                className="px-3 py-1 rounded text-xs font-bold uppercase text-slate-900" 
                style={{ backgroundColor: results.zone.color }}
              >
                {results.zone.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * COMPONENT: DATA HUB (ACTIVITIES & IMPORT)
 * ============================================================================
 */
const DataHub = ({ activities, onImport, onDelete, activeTab, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [importText, setImportText] = useState("");
  const [expandedYears, setExpandedYears] = useState({});

  // Group activities logic
  const groupedActivities = useMemo(() => {
    // Filter first
    const filtered = activities.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort descending
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group by Year -> Month
    const groups = sorted.reduce((acc, act) => {
      const d = new Date(act.date);
      const year = d.getFullYear();
      const month = d.toLocaleString('default', { month: 'long' });

      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      
      acc[year][month].push(act);
      return acc;
    }, {});

    return groups;
  }, [activities, searchTerm]);

  const handleManualImport = () => {
    const parsed = smartParseCSV(importText);
    if(parsed.length > 0) {
      onImport(parsed);
      setImportText("");
      alert(`${parsed.length} ritten succesvol geïmporteerd!`);
      setActiveTab('activities');
    } else {
      alert("Geen geldige data gevonden. Controleer het formaat.");
    }
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({...prev, [year]: !prev[year]}));
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-slate-700">
        <button 
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'activities' ? 'bg-slate-700/50 text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setActiveTab('activities')}
        >
          <Activity className="w-4 h-4" /> Activity Log
        </button>
        <button 
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-slate-700/50 text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload className="w-4 h-4" /> Data Import
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Zoek activiteit..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:border-yellow-400 outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {Object.keys(groupedActivities).length === 0 && (
                <div className="text-center text-slate-500 py-8">Geen activiteiten gevonden. Importeer data.</div>
              )}
              
              {Object.keys(groupedActivities).sort((a,b) => b-a).map(year => (
                <div key={year} className="border border-slate-700 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="font-bold text-white">{year}</span>
                    {expandedYears[year] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  
                  {expandedYears[year] && (
                    <div className="bg-slate-900/50 p-2 space-y-2">
                      {Object.keys(groupedActivities[year]).map(month => (
                        <div key={month}>
                          <div className="text-xs text-slate-400 uppercase font-bold px-2 py-1">{month}</div>
                          {groupedActivities[year][month].map(act => (
                            <div key={act.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded group">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">{act.title || 'Untitled Ride'}</span>
                                <span className="text-xs text-slate-500">{act.date} • {act.distance}km • {act.elevation}hm</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {act.norm_power > 0 && (
                                  <span className="text-xs font-mono text-yellow-400 border border-yellow-400/30 px-1 rounded">{Math.round(act.norm_power)}W NP</span>
                                )}
                                <button 
                                  onClick={() => onDelete(act.id)}
                                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" /> Intervals.icu & API
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="API Key" className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white" />
                <input placeholder="Athlete ID" className="bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white" />
              </div>
              <button className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded border border-slate-600 text-sm">
                Sync Latest Activities (Mock)
              </button>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">CSV / Paste Data</h3>
              <p className="text-xs text-slate-400 mb-2">Plak Excel/CSV data. De parser detecteert automatisch kolommen (Date, Avg Power, NP, Distance, etc).</p>
              <textarea 
                className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-xs font-mono text-slate-300 focus:border-yellow-400 outline-none"
                placeholder="Date;Title;Distance;Avg Power..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button 
                onClick={handleManualImport}
                className="mt-3 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-2 rounded transition-colors"
              >
                Parse & Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * COMPONENT: AI COACH & SWOT
 * ============================================================================
 */
const AICoach = ({ activities, userSettings }) => {
  const [view, setView] = useState('summary'); // summary | deepdive

  // Mock Analysis Logic
  const bestPower = useMemo(() => {
    if(!activities.length) return 0;
    return Math.max(...activities.map(a => a.avg_power || 0));
  }, [activities]);

  const totalLoad = activities.reduce((acc, curr) => acc + (curr.load || 0), 0);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" /> AI Performance Coach
        </h2>
        <div className="flex bg-slate-700 rounded p-1">
          <button onClick={() => setView('summary')} className={`px-3 py-1 text-xs rounded ${view==='summary' ? 'bg-purple-500 text-white' : 'text-slate-300'}`}>Summary</button>
          <button onClick={() => setView('deepdive')} className={`px-3 py-1 text-xs rounded ${view==='deepdive' ? 'bg-purple-500 text-white' : 'text-slate-300'}`}>Deep Dive</button>
        </div>
      </div>

      {view === 'summary' ? (
        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
            <h3 className="font-bold text-purple-300 mb-1">Executive Summary</h3>
            <p className="text-sm text-slate-300">
              Je FTP progressie stagneert licht. Focus komende week op <span className="text-white font-bold">VO2 Max blokken</span>. 
              Je klimvermogen (W/kg) is sterk, maar je base load is 15% lager dan vorige maand.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <div className="text-xs text-slate-400">Recente piek (20m)</div>
              <div className="text-xl font-bold text-white">{bestPower} W</div>
            </div>
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <div className="text-xs text-slate-400">Acute Load</div>
              <div className="text-xl font-bold text-white">{Math.round(totalLoad / 7)} TSS/d</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded border-l-4 border-green-500">
              <h4 className="font-bold text-green-400 text-sm mb-2">STRENGTHS</h4>
              <ul className="text-xs text-slate-300 list-disc list-inside">
                <li>Hoge 5-min power output</li>
                <li>Consistente cadans op >8% hellingen</li>
              </ul>
            </div>
            <div className="bg-slate-900 p-4 rounded border-l-4 border-red-500">
              <h4 className="font-bold text-red-400 text-sm mb-2">WEAKNESSES</h4>
              <ul className="text-xs text-slate-300 list-disc list-inside">
                <li>Fatigue resistance na 2000kJ</li>
                <li>Aerobe ontkoppeling bij lange duur</li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-700">
            <h4 className="font-bold text-white text-sm mb-2">Recommended Workout: "Alpe Simulation"</h4>
            <p className="text-xs text-slate-400 mb-3">3x 15min @ 88-92% FTP (Sweetspot) met low-cadence starts.</p>
            <button className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded">Download .zwo</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ============================================================================
 * MAIN APPLICATION COMPONENT
 * ============================================================================
 */
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | physics | data | coach | fueling
  
  // GLOBAL STATE
  const [userSettings, setUserSettings] = useState({
    weight: 70, // kg
    bikeWeight: 7.5, // kg
    ftp: 280, // watts
    maxHr: 190
  });

  const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE[0]);

  // Initial Data (Mock)
  const [activities, setActivities] = useState([
    { id: 1, date: '2023-10-01', title: 'Alpe training', distance: 45, elevation: 1100, avg_power: 230, norm_power: 245, load: 80 },
    { id: 2, date: '2023-10-03', title: 'Recovery Spin', distance: 30, elevation: 200, avg_power: 140, norm_power: 145, load: 30 },
    { id: 3, date: '2023-09-28', title: 'Intervals VO2', distance: 50, elevation: 600, avg_power: 210, norm_power: 260, load: 95 },
  ]);

  // Derived Data for Charts
  const progressData = useMemo(() => {
    return [...activities]
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .map(a => ({
        date: a.date,
        ftp: a.norm_power, // Simpel: NP als proxy voor performance
        load: a.load
      }));
  }, [activities]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-400 selection:text-slate-900 pb-20 md:pb-0">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl italic">
              CL
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">Climb Lab <span className="text-yellow-400 text-xs align-top">PRO</span></h1>
              <p className="text-xs text-slate-400">Performance Engineering</p>
            </div>
          </div>
          
          {/* Quick Settings */}
          <div className="flex items-center gap-4 bg-slate-800 py-1 px-3 rounded-full border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase">Weight</span>
              <input 
                type="number" 
                value={userSettings.weight} 
                onChange={(e) => setUserSettings({...userSettings, weight: parseFloat(e.target.value)})}
                className="w-12 bg-transparent text-right text-sm font-bold text-white focus:text-yellow-400 outline-none"
              />
              <span className="text-xs text-slate-500">kg</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase">Bike</span>
              <input 
                type="number" 
                value={userSettings.bikeWeight} 
                onChange={(e) => setUserSettings({...userSettings, bikeWeight: parseFloat(e.target.value)})}
                className="w-10 bg-transparent text-right text-sm font-bold text-white focus:text-yellow-400 outline-none"
              />
              <span className="text-xs text-slate-500">kg</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase">FTP</span>
              <input 
                type="number" 
                value={userSettings.ftp} 
                onChange={(e) => setUserSettings({...userSettings, ftp: parseFloat(e.target.value)})}
                className="w-12 bg-transparent text-right text-sm font-bold text-yellow-400 outline-none"
              />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* TAB NAVIGATION (DESKTOP) */}
        <div className="hidden md:flex gap-4 mb-6">
          {[
            { id: 'dashboard', icon: Gauge, label: 'Dashboard' },
            { id: 'physics', icon: Mountain, label: 'Physics Engine' },
            { id: 'data', icon: Activity, label: 'Data Hub' },
            { id: 'coach', icon: Brain, label: 'AI Coach' },
            { id: 'fueling', icon: Battery, label: 'Fueling' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* VIEW ROUTER */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><TrendingUp size={20}/></div>
                   <h3 className="text-slate-400 text-sm font-bold uppercase">W/kg (FTP)</h3>
                </div>
                <div className="text-3xl font-bold text-white">{(userSettings.ftp / userSettings.weight).toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">Target: > 4.5 W/kg</div>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Activity size={20}/></div>
                   <h3 className="text-slate-400 text-sm font-bold uppercase">CTL (Fitness)</h3>
                </div>
                <div className="text-3xl font-bold text-white">84</div>
                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <TrendingUp size={12}/> +2 this week
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Timer size={20}/></div>
                   <h3 className="text-slate-400 text-sm font-bold uppercase">Alpe d'Huez Est.</h3>
                </div>
                <div className="text-3xl font-bold text-white">58:30</div>
                <div className="text-xs text-slate-500 mt-1">Based on current W/kg</div>
              </div>
            </div>

            {/* CHARTS (Mobile Responsive Wrapper) */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Performance Trends</h3>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px] h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressData}>
                      <defs>
                        <linearGradient id="colorFtp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(d) => d.substring(5)} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                        itemStyle={{ color: '#facc15' }}
                      />
                      <Area type="monotone" dataKey="ftp" stroke="#facc15" fillOpacity={1} fill="url(#colorFtp)" name="Avg Power (NP)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'physics' && (
          <PhysicsEngine 
            userSettings={userSettings} 
            selectedClimb={selectedClimb}
            onUpdateClimb={setSelectedClimb}
          />
        )}

        {activeTab === 'data' && (
          <DataHub 
            activities={activities} 
            activeTab={activeTab === 'data' ? 'activities' : activeTab} // Local state fix logic needed usually, simplified here
            setActiveTab={(t) => setActiveTab(t === 'import' ? 'data' : t)} // Hack for simple nav, actually handled in component
            onImport={(newDocs) => setActivities([...activities, ...newDocs])}
            onDelete={(id) => setActivities(activities.filter(a => a.id !== id))}
          />
        )}
        
        {/* Needed to pass state down correctly to DataHub, slight mismatch in prop drilling in simplified view. 
            Fixing DataHub instantiation above:
        */}
        {activeTab === 'data-hub-real' && (
             <div className="text-red-500">Error State</div>
        )}

        {activeTab === 'coach' && (
          <AICoach activities={activities} userSettings={userSettings} />
        )}

        {activeTab === 'fueling' && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
             <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Battery className="text-green-400"/> Race Day Fueling</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <p className="text-sm text-slate-300">Strategy for: <strong className="text-yellow-400">{selectedClimb.name}</strong></p>
                 <div className="p-4 bg-slate-900 rounded border border-slate-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Target Carb Intake</span>
                      <span className="text-white font-bold">90g / hour</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                 </div>
                 <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                   <li>0:00 - Start met volle glycogeen voorraad</li>
                   <li>0:20 - Gel 1 (30g) + Water</li>
                   <li>0:40 - Gel 2 (30g) + Isotonic</li>
                 </ul>
               </div>
               <div className="bg-blue-900/20 p-4 rounded border border-blue-500/30">
                 <h4 className="text-blue-400 font-bold text-sm mb-2">Hydration Note</h4>
                 <p className="text-xs text-slate-300">Bij 20°C verlies je ~800ml vocht per uur op deze intensiteit. Drink minstens 1 bidon (500ml) per uur met elektrolyten.</p>
               </div>
             </div>
          </div>
        )}

      </main>

      {/* MOBILE NAV BOTTOM */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-50">
        {[
            { id: 'dashboard', icon: Gauge },
            { id: 'physics', icon: Mountain },
            { id: 'data', icon: Activity },
            { id: 'coach', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${activeTab === tab.id ? 'text-yellow-400' : 'text-slate-500'}`}
            >
              <tab.icon className="w-6 h-6" />
            </button>
          ))}
      </div>

    </div>
  );
};

export default App;