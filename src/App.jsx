import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Bar 
} from 'recharts';
import { 
  Activity, Upload, TrendingUp, ChevronDown, ChevronRight, 
  Timer, Search, Zap, Mountain, Gauge, Brain, Battery, 
  Droplets, Utensils, Minus, Plus, Link as LinkIcon, Download,
  Map
} from 'lucide-react';

/**
 * ============================================================================
 * 1. THE MASSIVE CLIMB DATABASE (REAL WORLD + COMPLETE ZWIFT)
 * ============================================================================
 */

// Helper: Generates Climbfinder URL for real world, defaults for Zwift if needed
const getClimbUrl = (name, country) => {
  if (country === 'Zwift') return `https://zwiftinsider.com/?s=${name.replace(/\s+/g, '+')}`;
  return `https://climbfinder.com/en/climbs/${name.toLowerCase().replace(/[\s/().']+/g, '-').replace(/-+$/, '')}`;
};

const CLIMB_DATABASE = [
  // --- REAL WORLD: FRANKRIJK ---
  { id: 'fr_alpe', name: "Alpe d'Huez", country: "FR", region: "Alpen", lengthKm: 13.8, elevation: 1061, avgGrade: 8.1 },
  { id: 'fr_ventoux', name: "Mont Ventoux (Bédoin)", country: "FR", region: "Provence", lengthKm: 21.5, elevation: 1610, avgGrade: 7.5 },
  { id: 'fr_galibier', name: "Col du Galibier (Valloire)", country: "FR", region: "Alpen", lengthKm: 18.1, elevation: 1245, avgGrade: 6.9 },
  { id: 'fr_tourmalet', name: "Col du Tourmalet (Luz)", country: "FR", region: "Pyreneeën", lengthKm: 19.0, elevation: 1404, avgGrade: 7.4 },
  { id: 'fr_aubisque', name: "Col d'Aubisque", country: "FR", region: "Pyreneeën", lengthKm: 16.6, elevation: 1190, avgGrade: 7.2 },
  { id: 'fr_grand_colombier', name: "Grand Colombier (Culoz)", country: "FR", region: "Jura", lengthKm: 18.3, elevation: 1255, avgGrade: 6.9 },
  { id: 'fr_bonette', name: "Cime de la Bonette", country: "FR", region: "Alpen", lengthKm: 24.0, elevation: 1589, avgGrade: 6.6 },
  { id: 'fr_puy_dome', name: "Puy de Dôme", country: "FR", region: "Massif Central", lengthKm: 13.3, elevation: 1033, avgGrade: 7.7 },
  
  // --- REAL WORLD: ITALIË ---
  { id: 'it_stelvio', name: "Passo dello Stelvio (Prato)", country: "IT", region: "Alpen", lengthKm: 24.8, elevation: 1845, avgGrade: 7.4 },
  { id: 'it_gavia', name: "Passo di Gavia", country: "IT", region: "Alpen", lengthKm: 17.3, elevation: 1363, avgGrade: 7.9 },
  { id: 'it_mortirolo', name: "Passo del Mortirolo", country: "IT", region: "Alpen", lengthKm: 12.4, elevation: 1300, avgGrade: 10.5 },
  { id: 'it_zoncolan', name: "Monte Zoncolan", country: "IT", region: "Alpen", lengthKm: 10.1, elevation: 1210, avgGrade: 11.9 },
  { id: 'it_tre_cime', name: "Tre Cime di Lavaredo", country: "IT", region: "Dolomieten", lengthKm: 7.2, elevation: 546, avgGrade: 7.6 },

  // --- REAL WORLD: SPANJE ---
  { id: 'es_angliru', name: "Alto de l'Angliru", country: "ES", region: "Asturië", lengthKm: 12.5, elevation: 1266, avgGrade: 10.1 },
  { id: 'es_lagos', name: "Lagos de Covadonga", country: "ES", region: "Asturië", lengthKm: 12.2, elevation: 866, avgGrade: 7.2 },
  { id: 'es_teide', name: "Mount Teide", country: "ES", region: "Tenerife", lengthKm: 45.0, elevation: 2300, avgGrade: 5.1 },
  { id: 'es_sa_calobra', name: "Sa Calobra", country: "ES", region: "Mallorca", lengthKm: 9.4, elevation: 668, avgGrade: 7.1 },

  // --- REAL WORLD: BENELUX/DE/AT ---
  { id: 'nl_cauberg', name: "Cauberg", country: "NL", region: "Limburg", lengthKm: 0.8, elevation: 65, avgGrade: 5.8 },
  { id: 'nl_camerig', name: "Camerig", country: "NL", region: "Limburg", lengthKm: 4.6, elevation: 175, avgGrade: 3.8 },
  { id: 'be_redoute', name: "Côte de la Redoute", country: "BE", region: "Ardennen", lengthKm: 1.6, elevation: 147, avgGrade: 9.2 },
  { id: 'at_grossglockner', name: "Grossglockner", country: "AT", region: "Alpen", lengthKm: 14.0, elevation: 1280, avgGrade: 9.5 },
  { id: 'at_kitzbuheler', name: "Kitzbüheler Horn", country: "AT", region: "Tirol", lengthKm: 9.7, elevation: 1290, avgGrade: 12.9 },

  // ==========================================
  // ZWIFT: WATOPIA (Regulars)
  // ==========================================
  { id: 'zw_alpe', name: "Alpe du Zwift", country: "Zwift", region: "Watopia", lengthKm: 12.2, elevation: 1036, avgGrade: 8.5 },
  { id: 'zw_epic', name: "Epic KOM", country: "Zwift", region: "Watopia", lengthKm: 9.4, elevation: 540, avgGrade: 5.9 },
  { id: 'zw_epic_rev', name: "Epic KOM Reverse", country: "Zwift", region: "Watopia", lengthKm: 6.2, elevation: 364, avgGrade: 5.9 },
  { id: 'zw_radio', name: "Radio Tower", country: "Zwift", region: "Watopia", lengthKm: 1.1, elevation: 150, avgGrade: 13.7 },
  { id: 'zw_volcano', name: "Volcano KOM", country: "Zwift", region: "Watopia", lengthKm: 3.75, elevation: 120, avgGrade: 3.2 },
  { id: 'zw_hilly', name: "Hilly KOM", country: "Zwift", region: "Watopia", lengthKm: 0.9, elevation: 50, avgGrade: 5.5 },
  { id: 'zw_hilly_rev', name: "Hilly KOM Reverse", country: "Zwift", region: "Watopia", lengthKm: 2.5, elevation: 49, avgGrade: 1.8 },
  
  // ==========================================
  // ZWIFT: WORLD MAPS (Regulars)
  // ==========================================
  { id: 'zw_ven_top', name: "Ven-Top", country: "Zwift", region: "France", lengthKm: 20.9, elevation: 1534, avgGrade: 7.3 },
  { id: 'zw_petit_kom', name: "Petit KOM", country: "Zwift", region: "France", lengthKm: 2.7, elevation: 106, avgGrade: 4.0 },
  { id: 'zw_innsbruck', name: "Innsbruck KOM", country: "Zwift", region: "Innsbruck", lengthKm: 7.4, elevation: 400, avgGrade: 5.4 },
  { id: 'zw_box_hill', name: "Box Hill", country: "Zwift", region: "London", lengthKm: 3.0, elevation: 137, avgGrade: 4.3 },
  { id: 'zw_leith_hill', name: "Leith Hill", country: "Zwift", region: "London", lengthKm: 1.9, elevation: 134, avgGrade: 6.8 },
  { id: 'zw_keith_hill', name: "Keith Hill", country: "Zwift", region: "London", lengthKm: 4.2, elevation: 228, avgGrade: 5.2 },
  { id: 'zw_fox_hill', name: "Fox Hill", country: "Zwift", region: "London", lengthKm: 2.4, elevation: 118, avgGrade: 4.9 },
  { id: 'zw_ny_kom', name: "New York KOM", country: "Zwift", region: "New York", lengthKm: 1.4, elevation: 89, avgGrade: 6.1 },
  { id: 'zw_richmond_kom', name: "Richmond KOM", country: "Zwift", region: "Richmond", lengthKm: 0.28, elevation: 19, avgGrade: 6.5 },
  { id: 'zw_richmond_23', name: "23rd Street", country: "Zwift", region: "Richmond", lengthKm: 0.27, elevation: 26, avgGrade: 10.0 },
  { id: 'zw_bologna', name: "San Luca (Bologna)", country: "Zwift", region: "Bologna", lengthKm: 2.0, elevation: 218, avgGrade: 10.8 },
  { id: 'zw_sgurr', name: "Sgurr Summit", country: "Zwift", region: "Scotland", lengthKm: 3.3, elevation: 113, avgGrade: 3.4 },
  { id: 'zw_yorkshire', name: "Yorkshire KOM", country: "Zwift", region: "Yorkshire", lengthKm: 1.2, elevation: 55, avgGrade: 5.5 },
  { id: 'zw_temple', name: "Temple KOM", country: "Zwift", region: "Makuri Islands", lengthKm: 1.9, elevation: 64, avgGrade: 3.6 },
  { id: 'zw_rooftop', name: "Rooftop KOM", country: "Zwift", region: "Makuri Islands", lengthKm: 1.87, elevation: 80, avgGrade: 4.3 },
  { id: 'zw_castle', name: "Castle KOM", country: "Zwift", region: "Makuri Islands", lengthKm: 2.7, elevation: 68, avgGrade: 2.5 },

  // ==========================================
  // ZWIFT: CLIMB PORTAL (The Simulation List)
  // ==========================================
  { id: 'zp_pike', name: "Cote de Pike", country: "Zwift", region: "Climb Portal", lengthKm: 2.0, elevation: 200, avgGrade: 10.0 },
  { id: 'zp_tourmalet', name: "Col du Tourmalet", country: "Zwift", region: "Climb Portal", lengthKm: 16.9, elevation: 1268, avgGrade: 7.4 },
  { id: 'zp_aspin', name: "Col d'Aspin", country: "Zwift", region: "Climb Portal", lengthKm: 12.0, elevation: 779, avgGrade: 6.5 },
  { id: 'zp_puy_dome', name: "Puy de Dôme", country: "Zwift", region: "Climb Portal", lengthKm: 10.5, elevation: 882, avgGrade: 8.4 },
  { id: 'zp_superplanche', name: "Superplanche", country: "Zwift", region: "Climb Portal", lengthKm: 7.0, elevation: 614, avgGrade: 8.7 },
  { id: 'zp_couillole', name: "Col de la Couillole", country: "Zwift", region: "Climb Portal", lengthKm: 15.8, elevation: 1157, avgGrade: 7.3 },
  { id: 'zp_eze', name: "Col d'Eze", country: "Zwift", region: "Climb Portal", lengthKm: 10.0, elevation: 501, avgGrade: 4.9 },
  { id: 'zp_willunga', name: "Old Willunga Hill", country: "Zwift", region: "Climb Portal", lengthKm: 3.0, elevation: 227, avgGrade: 7.6 },
  { id: 'zp_crow_road', name: "Crow Road", country: "Zwift", region: "Climb Portal", lengthKm: 5.6, elevation: 273, avgGrade: 4.8 },
  { id: 'zp_fuji', name: "Mt. Fuji (Subaru Line)", country: "Zwift", region: "Climb Portal", lengthKm: 22.2, elevation: 1182, avgGrade: 5.3 },
  { id: 'zp_rocacorba', name: "Rocacorba", country: "Zwift", region: "Climb Portal", lengthKm: 10.0, elevation: 650, avgGrade: 6.5 }, // Approx
  { id: 'zp_aravis', name: "Col des Aravis", country: "Zwift", region: "Climb Portal", lengthKm: 4.4, elevation: 257, avgGrade: 5.8 },
  { id: 'zp_domancy', name: "Cote de Domancy", country: "Zwift", region: "Climb Portal", lengthKm: 2.6, elevation: 218, avgGrade: 8.4 },
  { id: 'zp_tre_cime', name: "Tre Cime di Lavaredo", country: "Zwift", region: "Climb Portal", lengthKm: 7.5, elevation: 574, avgGrade: 7.6 },
  { id: 'zp_lusk', name: "Luskentyre", country: "Zwift", region: "Climb Portal", lengthKm: 3.2, elevation: 85, avgGrade: 2.7 },
  { id: 'zp_valparola', name: "Passo Valparola", country: "Zwift", region: "Climb Portal", lengthKm: 13.9, elevation: 813, avgGrade: 5.8 },

].map(c => ({...c, url: c.url || getClimbUrl(c.name, c.country)}));

const COGGAN_ZONES = [
  { name: 'Z1 Recovery', min: 0, max: 0.55, color: '#9ca3af', textColor: '#1f2937' },
  { name: 'Z2 Endurance', min: 0.56, max: 0.75, color: '#3b82f6', textColor: '#ffffff' },
  { name: 'Z3 Tempo', min: 0.76, max: 0.90, color: '#22c55e', textColor: '#ffffff' },
  { name: 'Z4 Threshold', min: 0.91, max: 1.05, color: '#eab308', textColor: '#ffffff' },
  { name: 'Z5 VO2 Max', min: 1.06, max: 1.20, color: '#f97316', textColor: '#ffffff' },
  { name: 'Z6 Anaerobic', min: 1.21, max: 1.50, color: '#ef4444', textColor: '#ffffff' },
  { name: 'Z7 Neuro', min: 1.51, max: 10.0, color: '#a855f7', textColor: '#ffffff' }
];

/**
 * ============================================================================
 * 2. HELPERS & PARSERS
 * ============================================================================
 */

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseDurationToSeconds = (str) => {
  if(!str) return 0;
  if(str.includes('h') || str.includes('m')) {
    let s = 0;
    const h = str.match(/(\d+)h/);
    const m = str.match(/(\d+)m/);
    if(h) s += parseInt(h[1]) * 3600;
    if(m) s += parseInt(m[1]) * 60;
    return s;
  }
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// Rolling Average Logic (±15 days window)
const calculateRollingTrend = (activities, targetDateStr, metricKey, windowDays = 15) => {
  const targetDate = new Date(targetDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  
  const inWindow = activities.filter(a => {
    const d = new Date(a.date);
    const diffDays = Math.abs((targetDate - d) / msPerDay);
    return diffDays <= windowDays && a[metricKey] > 0;
  });

  if (inWindow.length === 0) return 0;
  const sum = inWindow.reduce((acc, curr) => acc + curr[metricKey], 0);
  return sum / inWindow.length;
};

// Advanced CSV Parser (Includes Intervals.icu mapping)
const smartParseCSV = (text, type = 'generic') => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const rawHeaders = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

  const mapHeader = (h) => {
    if (h === 'icu_training_load' || h === 'training_load') return 'load';
    if (h === 'icu_intensity' || h === 'intensity') return 'intensity';
    if (h === 'moving_time' || h === 'elapsed_time') return 'moving_time';
    if (h === 'icu_rpe' || h === 'feel') return 'rpe';
    
    if (h.includes('date') || h.includes('datum')) return 'date';
    if (h.includes('title') || h.includes('naam') || h.includes('activity')) return 'title';
    if (h.includes('distance') || h.includes('afstand')) return 'distance';
    if (h.includes('climb') || h.includes('elevation') || h.includes('hoogte')) return 'climbing';
    if (h.includes('speed') || h.includes('snelheid')) return 'avg_speed';
    if (h.includes('norm') || h.includes('np')) return 'norm_power';
    if (h.includes('avg power') || h.includes('gem. vermogen')) return 'avg_power';
    if (h.includes('load') || h.includes('tss')) return 'load';
    if (h.includes('rpe')) return 'rpe';
    
    if (h.includes('5m') || h.includes('5 min')) return 'best_5min';
    if (h.includes('20m') || h.includes('20 min')) return 'best_20min';
    if (h.includes('60m') || h.includes('60 min')) return 'best_60min';
    
    return null;
  };

  const colMap = rawHeaders.map(mapHeader);

  return lines.slice(1).map(line => {
    const cols = line.split(delimiter);
    const entry = {};
    
    colMap.forEach((key, idx) => {
      if (key && cols[idx]) {
        let val = cols[idx].trim().replace(/['"]+/g, '');
        if (!['title', 'date'].includes(key)) {
          if (key === 'moving_time' && val.includes(':')) {
            val = parseDurationToSeconds(val);
          } else {
            val = parseFloat(val.replace(',', '.'));
          }
          if (isNaN(val)) val = 0;
        }
        entry[key] = val;
      }
    });

    if (!entry.id) entry.id = Math.random().toString(36).substr(2, 9);
    if (!entry.date) entry.date = new Date().toISOString().split('T')[0];
    
    return entry;
  }).filter(e => e.distance > 0 || e.moving_time > 0);
};


/**
 * ============================================================================
 * 3. SUB-COMPONENTS
 * ============================================================================
 */

// 3.1 PHYSICS ENGINE
const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target'); 
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });

  const updateWeight = (type, delta) => {
    const current = type === 'body' ? userSettings.weight : userSettings.bikeWeight;
    const newVal = parseFloat((current + delta).toFixed(1));
    setUserSettings(prev => ({ ...prev, [type === 'body' ? 'weight' : 'bikeWeight']: newVal }));
  };

  useEffect(() => {
    if (!selectedClimb) return;
    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    
    // Physics
    const g = 9.81; const rho = 1.225; const cda = 0.32; const crr = 0.004; const loss = 0.03;

    let watts = 0, seconds = 0;

    if (mode === 'target') {
      seconds = parseDurationToSeconds(targetTimeStr);
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

    setCalc({ watts: Math.round(watts), wkg: wkg.toFixed(2), time: formatTime(seconds), vam: Math.round(vam), zone: zone });

  }, [mode, targetTimeStr, targetWatts, selectedClimb, userSettings]);

  // Group climbs by Country (and split Zwift by Region for better UX)
  const climbsGrouped = useMemo(() => {
    const groups = {};
    CLIMB_DATABASE.forEach(c => {
      // Special logic for Zwift to create subgroups in dropdown
      let key = c.country;
      if(c.country === 'Zwift') {
          key = `Zwift - ${c.region}`; 
      }
      
      if(!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, []);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div>
           <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Mountain className="w-6 h-6" /> Physics Engine</h2>
        </div>
        <div className="flex items-center gap-2">
            <select 
              className="bg-slate-700 text-white rounded p-2 text-sm border border-slate-600 outline-none focus:border-yellow-400 max-w-[250px]"
              value={selectedClimb.id}
              onChange={(e) => onUpdateClimb(CLIMB_DATABASE.find(c => c.id === e.target.value))}
            >
              {/* Sort keys to have Countries first, then Zwift */}
              {Object.keys(climbsGrouped).sort((a,b) => a.localeCompare(b)).map(group => (
                <optgroup key={group} label={group}>
                  {climbsGrouped[group].map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
            <a href={selectedClimb.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white" title="View Info"><LinkIcon size={16}/></a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Rider</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateWeight('body', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14}/></button>
                        <span className="font-mono w-16 text-center">{userSettings.weight.toFixed(1)} kg</span>
                        <button onClick={() => updateWeight('body', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14}/></button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Bike</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => updateWeight('bike', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14}/></button>
                        <span className="font-mono w-16 text-center">{userSettings.bikeWeight.toFixed(1)} kg</span>
                        <button onClick={() => updateWeight('bike', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14}/></button>
                    </div>
                </div>
            </div>

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

// 3.2 DATA HUB (Fixed Tabs & Intervals.icu support)
const DataHub = ({ activities, onImport, onDelete }) => {
  const [internalTab, setInternalTab] = useState('log'); // 'log' | 'import' | 'intervals'
  const [importText, setImportText] = useState("");
  const [search, setSearch] = useState("");

  const handleImport = (type) => {
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

  const filtered = activities.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()) || a.date.includes(search));

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="flex border-b border-slate-700">
            <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
            <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>CSV / Excel</button>
            <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Intervals.icu</button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {internalTab === 'log' && (
                <>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek op datum, naam..." className="w-full bg-slate-900 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-400 outline-none" />
                    </div>
                    <div className="overflow-x-auto flex-1 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Title</th>
                                    <th className="p-3 text-right">Dist</th>
                                    <th className="p-3 text-right">Elev</th>
                                    <th className="p-3 text-right text-yellow-400">NP</th>
                                    <th className="p-3 text-right">20m</th>
                                    <th className="p-3 text-right">Load</th>
                                    <th className="p-3 text-right">RPE</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filtered.map(act => (
                                    <tr key={act.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="p-3 text-slate-300">{act.date}</td>
                                        <td className="p-3 font-medium text-white max-w-[150px] truncate">{act.title}</td>
                                        <td className="p-3 text-right text-slate-400">{parseFloat(act.distance).toFixed(1)}</td>
                                        <td className="p-3 text-right text-slate-400">{Math.round(act.climbing || 0)}</td>
                                        <td className="p-3 text-right font-bold text-yellow-400">{Math.round(act.norm_power || 0)}</td>
                                        <td className="p-3 text-right text-slate-400">{Math.round(act.best_20min || 0)}</td>
                                        <td className="p-3 text-right text-blue-400">{Math.round(act.load || 0)}</td>
                                        <td className="p-3 text-right text-slate-400">{act.rpe}</td>
                                        <td className="p-3 text-right"><button onClick={() => onDelete(act.id)} className="text-red-500 hover:text-red-400 font-bold">×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {internalTab === 'import' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded border border-slate-600">
                        <h3 className="font-bold text-white mb-2">CSV / Excel Paste</h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Ondersteunde kolommen (header detectie):<br/>
                            <span className="text-yellow-500 font-mono">Date, Title, Distance, Climbing, Norm Power, Avg Power, Load, RPE, 5m, 20m, 60m</span>
                        </p>
                        <textarea 
                            className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white outline-none focus:border-yellow-400"
                            placeholder="Date;Title;Distance;Norm Power..."
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                        />
                        <button onClick={() => handleImport('generic')} className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-3 rounded">Import & Parse</button>
                    </div>
                </div>
            )}

            {internalTab === 'intervals' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded border border-slate-600">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="p-2 bg-orange-500/20 rounded text-orange-400"><Activity size={20}/></div>
                           <h3 className="font-bold text-white">Intervals.icu Import</h3>
                        </div>
                        <p className="text-sm text-slate-300 mb-4">
                           1. Ga naar Intervals.icu - Activities - List View.<br/>
                           2. Klik "Edit" - "Download CSV".<br/>
                           3. Plak de inhoud hieronder. De parser herkent automatisch `icu_training_load`, `icu_rpe`, etc.
                        </p>
                        <textarea 
                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-xs font-mono text-white outline-none focus:border-orange-400"
                            placeholder="date,name,moving_time,distance,icu_training_load,icu_rpe..."
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                        />
                        <button onClick={() => handleImport('intervals')} className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded">Parse Intervals CSV</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// 3.3 FUELING
const FuelingStrategy = () => {
    const [duration, setDuration] = useState(180); 
    const [intensity, setIntensity] = useState(0.85);

    const requirements = useMemo(() => {
        const carbsPerHour = intensity > 0.9 ? 90 : intensity > 0.8 ? 75 : 60;
        const totalCarbs = (duration / 60) * carbsPerHour;
        const fluidPerHour = 600;
        const totalFluid = (duration / 60) * fluidPerHour;
        const sodiumPerHour = 500;
        return { carbsPerHour, totalCarbs, fluidPerHour, totalFluid, sodiumPerHour };
    }, [duration, intensity]);

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
                                <div className="text-lg font-bold text-white">{requirements.sodiumPerHour}mg</div>
                                <div className="text-[10px] text-slate-400">Na+/hr</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                         <h3 className="text-slate-300 font-bold mb-1">Total Race Load</h3>
                         <p className="text-3xl font-bold text-white">{Math.round(requirements.totalCarbs)}g <span className="text-sm font-normal text-slate-500">Koolhydraten</span></p>
                         <p className="text-lg text-blue-400 mt-1">{Math.round(requirements.totalFluid/1000 * 10)/10}L <span className="text-sm text-slate-500">Vocht</span></p>
                    </div>
                    <div className="mt-4">
                        <div className="text-xs text-slate-400 uppercase mb-2">Example Strategy</div>
                        <ul className="text-xs text-slate-300 space-y-2">
                             <li className="flex gap-2"><span className="text-yellow-400 font-bold">Start:</span> Pre-load 500ml sodium + 1 gel.</li>
                             <li className="flex gap-2"><span className="text-yellow-400 font-bold">Elk uur:</span> 1x Bidon (40g Mix) + 1x Gel (30g) + 1x Reep.</li>
                             <li className="flex gap-2"><span className="text-yellow-400 font-bold">Finale:</span> Switch naar cafeïne gels in laatste uur.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * ============================================================================
 * 4. MAIN APP
 * ============================================================================
 */

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [userSettings, setUserSettings] = useState({
    weight: 70.0,
    bikeWeight: 7.5,
    ftp: 280,
    maxHr: 190
  });

  const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE[19]); // Default to Alpe du Zwift

  // Initial Data 
  const [activities, setActivities] = useState([
    { id: '1', date: '2023-09-01', title: 'Base Miles', distance: 60, climbing: 400, norm_power: 200, avg_power: 180, load: 80, best_5min: 250, best_20min: 220, best_60min: 200, rpe: 4 },
    { id: '2', date: '2023-09-05', title: 'Intervals', distance: 45, climbing: 600, norm_power: 260, avg_power: 210, load: 110, best_5min: 350, best_20min: 280, best_60min: 220, rpe: 8 },
    { id: '3', date: '2023-09-12', title: 'Alpe Test', distance: 40, climbing: 1100, norm_power: 275, avg_power: 270, load: 130, best_5min: 310, best_20min: 295, best_60min: 270, rpe: 9 },
    { id: '4', date: '2023-09-20', title: 'Recovery', distance: 30, climbing: 100, norm_power: 150, avg_power: 140, load: 30, best_5min: 160, best_20min: 150, best_60min: 140, rpe: 2 },
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">FTP Setting</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{userSettings.ftp}</span>
                        <span className="text-sm text-slate-500">W</span>
                    </div>
                 </div>
                 <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Weight (User)</h3>
                    <div className="flex items-center justify-between">
                         <span className="text-3xl font-bold text-white">{userSettings.weight.toFixed(1)}</span>
                         <div className="flex gap-1">
                            <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight-0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">-</button>
                            <button onClick={()=>setUserSettings(s=>({...s, weight: parseFloat((s.weight+0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">+</button>
                         </div>
                    </div>
                 </div>
                 <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Weight (Bike)</h3>
                    <div className="flex items-center justify-between">
                         <span className="text-3xl font-bold text-white">{userSettings.bikeWeight.toFixed(1)}</span>
                         <div className="flex gap-1">
                            <button onClick={()=>setUserSettings(s=>({...s, bikeWeight: parseFloat((s.bikeWeight-0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">-</button>
                            <button onClick={()=>setUserSettings(s=>({...s, bikeWeight: parseFloat((s.bikeWeight+0.1).toFixed(1))}))} className="p-1 bg-slate-700 rounded hover:bg-slate-600">+</button>
                         </div>
                    </div>
                 </div>
                 <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">CTL (Load)</h3>
                    <span className="text-3xl font-bold text-blue-400">{Math.round(activities.reduce((acc,c)=>acc+c.load,0)/42)}</span>
                    <span className="text-xs text-slate-500 ml-2">avg/day</span>
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
                 <div className="h-[350px] w-full">
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
        )}

        {activeTab === 'physics' && <PhysicsEngine userSettings={userSettings} setUserSettings={setUserSettings} selectedClimb={selectedClimb} onUpdateClimb={setSelectedClimb} />}
        {activeTab === 'data' && <DataHub activities={activities} onImport={(n) => setActivities([...activities, ...n])} onDelete={(id) => setActivities(activities.filter(a => a.id !== id))} />}
        {activeTab === 'fueling' && <FuelingStrategy />}
      </main>
    </div>
  );
};

export default App;