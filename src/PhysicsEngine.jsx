import React, { useState, useEffect, useMemo } from 'react';
import { Mountain, Info, Minus, Plus } from 'lucide-react';
import { CLIMB_DATABASE, COGGAN_ZONES } from '../climbs';
import { parseDurationToSeconds } from '../utils'; // We gebruiken de centrale utils functie

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target'); 
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });
  const [countryFilter, setCountryFilter] = useState('All');

  // Functie om gewicht aan te passen via de + en - knoppen
  const updateWeight = (type, delta) => {
    const current = type === 'body' ? userSettings.weight : userSettings.bikeWeight;
    const newVal = parseFloat((current + delta).toFixed(1));
    
    // Update de settings in de hoofapp via de prop
    if (type === 'body') {
        setUserSettings(prev => ({ ...prev, weight: newVal }));
    } else {
        setUserSettings(prev => ({ ...prev, bikeWeight: newVal }));
    }
  };

  useEffect(() => {
    if (!selectedClimb) return;
    const totalWeight = userSettings.weight + userSettings.bikeWeight;
    const grade = selectedClimb.avgGrade / 100;
    const distance = selectedClimb.lengthKm * 1000;
    const elevation = selectedClimb.elevation;
    
    // Physics Constants
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

export default PhysicsEngine;