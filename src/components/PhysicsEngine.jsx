import React, { useState, useEffect, useMemo } from 'react';
import { Mountain, Info, Minus, Plus, Search, Filter } from 'lucide-react';
import { CLIMB_DATABASE, COGGAN_ZONES } from '../climbs';
import { parseDurationToSeconds, calculateFerrariWatts, calculateClimbCategory } from '../utils';

// Helper component for numeric filter inputs
const NumberFilter = ({ label, value, onChange, min, max, step = 1, showDecimals = false }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">{label}</span>
    <div className="flex items-center bg-slate-800 rounded border border-slate-600">
      <button
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(showDecimals ? 1 : 0))))}
        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-12 text-center bg-transparent text-xs text-white outline-none font-mono"
      />
      <button
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(showDecimals ? 1 : 0))))}
        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  </div>
);

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target');
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });
  const [countryFilter, setCountryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  // FILTERS
  const [searchTerm, setSearchTerm] = useState('');
  // Default range: 0-100km, 0-25%
  const [minDist, setMinDist] = useState(0);
  const [maxDist, setMaxDist] = useState(100);
  const [minGrade, setMinGrade] = useState(0);
  const [maxGrade, setMaxGrade] = useState(25);

  // Physics Params State
  const [cda, setCda] = useState(0.32);
  const [crr, setCrr] = useState(0.004);
  const [loss, setLoss] = useState(0.03);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateWeight = (type, delta) => {
    const current = type === 'body' ? userSettings.weight : userSettings.bikeWeight;
    const newVal = parseFloat((current + delta).toFixed(1));
    if (type === 'body') setUserSettings(prev => ({ ...prev, weight: newVal }));
    else setUserSettings(prev => ({ ...prev, bikeWeight: newVal }));
  };

  useEffect(() => {
    if (!selectedClimb) return;
    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    const g = 9.81;
    const rho = 1.225;

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
      for (let i = 0; i < 10; i++) {
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
      ferrariWatts: calculateFerrariWatts(vam, grade * 100, totalWeight),
      ferrariWkg: calculateFerrariWatts(vam, grade * 100),
      zone: zone
    });

  }, [mode, targetTimeStr, targetWatts, selectedClimb, userSettings, cda, crr, loss]);

  // Enhanced Filter Logic
  const filteredClimbs = useMemo(() => {
    let climbs = CLIMB_DATABASE;

    // 1. Text Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      climbs = climbs.filter(c => c.name.toLowerCase().includes(lower) || c.id.toLowerCase().includes(lower));
    }

    // 2. Country/Region
    if (countryFilter !== 'All') {
      climbs = climbs.filter(c => c.country === countryFilter);
    }
    if (regionFilter !== 'All') {
      climbs = climbs.filter(c => c.region === regionFilter);
    }

    // 3. Range Filters
    climbs = climbs.filter(c => c.lengthKm >= minDist && c.lengthKm <= maxDist);
    climbs = climbs.filter(c => c.avgGrade >= minGrade && c.avgGrade <= maxGrade);

    return climbs;
  }, [countryFilter, regionFilter, searchTerm, minDist, maxDist, minGrade, maxGrade]);

  // Auto-Select unique match logic
  useEffect(() => {
    // If the search term is precise enough (>= 3 chars) and results in exactly 1 match
    // AND that match is not already selected (to avoid loops/re-selection annoyance)
    if (searchTerm.length >= 3 && filteredClimbs.length === 1) {
      if (filteredClimbs[0].id !== selectedClimb?.id) {
        onUpdateClimb(filteredClimbs[0]);
      }
    }
  }, [searchTerm, filteredClimbs, onUpdateClimb, selectedClimb]);


  const climbsGrouped = useMemo(() => {
    const groups = {};
    filteredClimbs.forEach(c => {
      let key = c.country;
      if (c.country === 'Zwift') key = `Zwift - ${c.region}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [filteredClimbs]);

  const calculateZoneWidth = (zone) => {
    // Visual max is 150% of FTP (1.5)
    // We clamp the zone's max to 1.5 for visual representation
    const VISUAL_MAX = 1.6;
    const min = Math.min(zone.min, VISUAL_MAX);
    const max = Math.min(zone.max, VISUAL_MAX);
    const width = max - min;
    return (width / VISUAL_MAX) * 100;
  };

  const uniqueCountries = useMemo(() => ['All', ...new Set(CLIMB_DATABASE.map(c => c.country))].sort(), []);
  const uniqueRegions = useMemo(() => {
    if (countryFilter === 'All') return [];
    const regions = CLIMB_DATABASE.filter(c => c.country === countryFilter).map(c => c.region);
    return ['All', ...new Set(regions)].sort();
  }, [countryFilter]);

  const handleCountryChange = (country) => {
    setCountryFilter(country);
    setRegionFilter('All');
  };

  const selectedCategory = useMemo(() => {
    if (!selectedClimb) return null;
    return calculateClimbCategory(selectedClimb.lengthKm, selectedClimb.avgGrade);
  }, [selectedClimb]);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Mountain className="w-6 h-6" /> Physics Engine</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-xs font-bold px-3 py-1 rounded border ${showAdvanced ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400' : 'text-slate-400 border-slate-600'}`}
            >
              Advanced Physics
            </button>
            <a href={selectedClimb?.url || '#'} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs" title="View Info">
              <Info size={14} /> OnlyInfo
            </a>
          </div>
        </div>

        {/* ADVANCED PHYSICS PANEL */}
        {showAdvanced && (
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 grid grid-cols-3 gap-4 text-xs animate-in slide-in-from-top-2">
            <div>
              <label className="block text-slate-400 mb-1">CdA (Aerodrag)</label>
              <input type="number" step="0.01" value={cda} onChange={e => setCda(parseFloat(e.target.value))} className="w-full bg-slate-800 text-white rounded p-2 border border-slate-600 focus:border-yellow-400 outline-none" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Crr (Rolling Res.)</label>
              <input type="number" step="0.001" value={crr} onChange={e => setCrr(parseFloat(e.target.value))} className="w-full bg-slate-800 text-white rounded p-2 border border-slate-600 focus:border-yellow-400 outline-none" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Drivetrain Loss %</label>
              <input type="number" step="0.01" value={loss} onChange={e => setLoss(parseFloat(e.target.value))} className="w-full bg-slate-800 text-white rounded p-2 border border-slate-600 focus:border-yellow-400 outline-none" />
            </div>
          </div>
        )}

        {/* PERMANENT FILTER PANEL */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
          <div className="flex gap-4">
            {/* Search Bar - Flex 1 to take available space */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search climb (e.g. 'Ventoux')..."
                className="w-full bg-slate-800 border border-slate-600 rounded pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              />
            </div>

            {/* Numeric Filters - Compact grid */}
            <div className="flex gap-3">
              <NumberFilter label="Min Km" value={minDist} onChange={setMinDist} min={0} max={maxDist} step={5} />
              <NumberFilter label="Max Km" value={maxDist} onChange={setMaxDist} min={minDist} max={200} step={5} />
              <NumberFilter label="Min %" value={minGrade} onChange={setMinGrade} min={0} max={maxGrade} step={1} showDecimals />
              <NumberFilter label="Max %" value={maxGrade} onChange={setMaxGrade} min={minGrade} max={25} step={1} showDecimals />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            {/* Country Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {uniqueCountries.map(c => (
                <button
                  key={c}
                  onClick={() => handleCountryChange(c)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${countryFilter === c ? 'bg-yellow-400 text-slate-900 border border-yellow-400' : 'bg-slate-800 border-slate-600 border text-slate-400 hover:text-white'}`}
                >
                  {c === 'All' ? '🌍 All' : c}
                </button>
              ))}
            </div>

            {/* Region Filter */}
            {countryFilter !== 'All' && uniqueRegions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide animate-in fade-in slide-in-from-top-1">
                {uniqueRegions.map(r => (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${regionFilter === r ? 'bg-orange-400 text-slate-900 border border-orange-400' : 'bg-slate-800 border border-slate-600 text-slate-400 hover:text-white'}`}
                  >
                    {r === 'All' ? 'Alle Regio\'s' : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Climb Selector & Category Badge */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              {/* Results count badge */}
              <div className="absolute right-8 top-3 text-[10px] text-slate-400 pointer-events-none">
                {filteredClimbs.length} results
              </div>
              <select
                className="w-full bg-slate-800 text-white rounded p-3 text-sm border border-slate-600 outline-none focus:border-yellow-400"
                value={selectedClimb?.id || ''}
                onChange={(e) => {
                  e.target.blur();
                  onUpdateClimb(CLIMB_DATABASE.find(c => c.id === e.target.value));
                }}
              >
                {Object.keys(climbsGrouped).sort().map(group => (
                  <optgroup key={group} label={group}>
                    {climbsGrouped[group].map(c => <option key={c.id} value={c.id}>{c.name} ({c.lengthKm}km @ {c.avgGrade}%)</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {selectedCategory && (
              <div className={`flex flex-col items-center justify-center px-4 rounded border ${selectedCategory.className} min-w-[60px] cursor-help transition-transform hover:scale-105`} title={selectedCategory.full}>
                <span className="text-lg leading-none">{selectedCategory.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Rider</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateWeight('body', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14} /></button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.weight.toFixed(1)} kg</span>
                <button onClick={() => updateWeight('body', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Bike</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateWeight('bike', -0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14} /></button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.bikeWeight.toFixed(1)} kg</span>
                <button onClick={() => updateWeight('bike', 0.1)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-1 flex">
            <button onClick={() => setMode('target')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'target' ? 'bg-yellow-400 text-slate-900' : 'text-slate-300'}`}>Target Time</button>
            <button onClick={() => setMode('predict')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'predict' ? 'bg-yellow-400 text-slate-900' : 'text-slate-300'}`}>Predict</button>
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
          <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
            <span className="text-xs text-slate-400 uppercase mb-1" title="Dr. Ferrari Formula (Gradient corrected)">Ferrari Eq. Power</span>
            <span className="text-3xl font-bold text-orange-400">{calc.ferrariWatts} <small className="text-sm text-orange-600">W</small></span>
            <span className="text-[10px] text-slate-500">{calc.ferrariWkg} W/kg</span>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col items-center justify-center border border-slate-600">
            <span className="text-xs text-slate-400 uppercase mb-1">Energy / Work</span>
            <span className="text-3xl font-bold text-blue-400">
              {calc.watts > 0 ? Math.round((calc.watts * parseDurationToSeconds(calc.time)) / 1000) : 0}
              <small className="text-sm text-blue-600"> kJ</small>
            </span>
            <span className="text-[10px] text-slate-500">~{calc.watts > 0 ? Math.round((calc.watts * parseDurationToSeconds(calc.time)) / 1000) : 0} kCal</span>
          </div>

          <div className="col-span-2 bg-slate-900 p-4 rounded-lg border border-slate-700">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-white">Intensity Zone</span>
              {calc.zone && <span style={{ color: calc.zone.color }} className="font-bold text-sm uppercase">{calc.zone.name}</span>}
            </div>
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="w-full h-6 bg-slate-800 rounded-full overflow-hidden flex relative">
                {COGGAN_ZONES.map((z, i) => (
                  <div
                    key={i}
                    style={{ width: `${calculateZoneWidth(z)}%`, background: z.color }}
                    className="h-full opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center"
                    title={`${z.name} (${Math.round(z.min * 100)}% - ${Math.round(z.max * 100 > 200 ? '>150' : z.max * 100)}%)`}
                  >
                    {/* Only show label if width is sufficient (>10%) */}
                    {calculateZoneWidth(z) > 10 && <span className="text-[9px] font-bold text-white/80 drop-shadow-md truncate px-1">{z.id}</span>}
                  </div>
                ))}
              </div>
              <div className="relative w-full h-2 mt-1">
                <div
                  className="absolute top-0 bottom-0 w-[4px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 transition-all duration-500"
                  style={{ left: `${Math.min(Math.max((calc.watts / userSettings.ftp) / 1.6 * 100, 0), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      );
};

      export default PhysicsEngine;