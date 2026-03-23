import React, { useState, useEffect } from 'react';
import { Mountain, Info, Minus, Plus } from 'lucide-react';
import { COGGAN_ZONES } from '../climbs';
import { parseDurationToSeconds, calculateFerrariWatts } from '../utils';
import ClimbSelector from './shared/ClimbSelector';

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const [mode, setMode] = useState('target');
  const [targetTimeStr, setTargetTimeStr] = useState("59:00");
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);
  const [calc, setCalc] = useState({ watts: 0, wkg: 0, time: "", vam: 0, zone: null });

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

  const adjustTargetTime = (deltaSeconds) => {
    const currentSeconds = parseDurationToSeconds(targetTimeStr);
    const newSeconds = Math.max(0, currentSeconds + deltaSeconds);
    const date = new Date(newSeconds * 1000);
    const formatted = newSeconds >= 3600
      ? date.toISOString().substr(11, 8)
      : date.toISOString().substr(14, 5);
    setTargetTimeStr(formatted);
  };

  const adjustTargetWatts = (delta) => {
    setTargetWatts(prev => Math.max(0, Number(prev) + delta));
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

  const calculateZoneWidth = (zone) => {
    // Visual max is 150% of FTP (1.5)
    const VISUAL_MAX = 1.6;
    const min = Math.min(zone.min, VISUAL_MAX);
    const max = Math.min(zone.max, VISUAL_MAX);
    const width = max - min;
    return (width / VISUAL_MAX) * 100;
  };

  return (
    <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Mountain className="w-6 h-6" /> Physics Engine</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-xs font-bold px-3 py-1 rounded border ${showAdvanced ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400' : 'text-cdmuted border-cdborder'}`}
            >
              Advanced Physics
            </button>
            <a href={selectedClimb?.url || '#'} target="_blank" rel="noreferrer" className="text-cdmuted hover:text-cdtext flex items-center gap-1 text-xs" title="View Info">
              <Info size={14} /> OnlyInfo
            </a>
          </div>
        </div>

        {/* ADVANCED PHYSICS PANEL */}
        {showAdvanced && (
          <div className="bg-cdbg/50 p-4 rounded-lg border border-cdborder grid grid-cols-3 gap-4 text-xs animate-in slide-in-from-top-2">
            <div>
              <label className="block text-cdmuted mb-1">CdA (Aerodrag)</label>
              <input type="number" step="0.01" value={cda} onChange={e => setCda(parseFloat(e.target.value))} className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none" />
            </div>
            <div>
              <label className="block text-cdmuted mb-1">Crr (Rolling Res.)</label>
              <input type="number" step="0.001" value={crr} onChange={e => setCrr(parseFloat(e.target.value))} className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none" />
            </div>
            <div>
              <label className="block text-cdmuted mb-1">Drivetrain Loss %</label>
              <input type="number" step="0.01" value={loss} onChange={e => setLoss(parseFloat(e.target.value))} className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none" />
            </div>
          </div>
        )}

        {/* Climb Selector */}
        <ClimbSelector
          mode="single"
          selected={selectedClimb}
          onSelect={onUpdateClimb}
          showCategoryBadge
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-cdbg p-4 rounded-lg border border-cdborder space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-cdtext">Rider</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateWeight('body', -0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600"><Minus size={14} /></button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.weight.toFixed(1)} kg</span>
                <button onClick={() => updateWeight('body', 0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-cdtext">Bike</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateWeight('bike', -0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600"><Minus size={14} /></button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.bikeWeight.toFixed(1)} kg</span>
                <button onClick={() => updateWeight('bike', 0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          <div className="bg-cdborder rounded-lg p-1 flex">
            <button onClick={() => setMode('target')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'target' ? 'bg-yellow-400 text-slate-900' : 'text-cdtext'}`}>Target Time</button>
            <button onClick={() => setMode('predict')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'predict' ? 'bg-yellow-400 text-slate-900' : 'text-cdtext'}`}>Predict</button>
          </div>

          <div className="bg-cdbg border border-yellow-400/30 p-4 rounded-lg">
            <label className="text-xs text-yellow-400 uppercase font-bold mb-2 block">{mode === 'target' ? 'Desired Time' : 'Sustainable Power'}</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => mode === 'target' ? adjustTargetTime(-1) : adjustTargetWatts(-1)}
                className="p-2 bg-cdsurface rounded hover:bg-cdborder text-cdmuted hover:text-cdtext transition-colors"
              >
                <Minus size={20} />
              </button>

              {mode === 'target' ? (
                <input value={targetTimeStr} onChange={e => setTargetTimeStr(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-center text-cdtext outline-none border-b border-transparent focus:border-yellow-400" />
              ) : (
                <input type="number" value={targetWatts} onChange={e => setTargetWatts(e.target.value)} className="w-full bg-transparent text-3xl font-mono text-center text-cdtext outline-none border-b border-transparent focus:border-yellow-400" />
              )}

              <button
                onClick={() => mode === 'target' ? adjustTargetTime(1) : adjustTargetWatts(1)}
                className="p-2 bg-cdsurface rounded hover:bg-cdborder text-cdmuted hover:text-cdtext transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 gap-4">
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Required Power</span>
            <span className="text-3xl font-bold text-cdtext">{calc.watts} <small className="text-sm text-cdmuted">W</small></span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Power / Weight</span>
            <span className="text-3xl font-bold text-yellow-400">{calc.wkg} <small className="text-sm text-yellow-600">W/kg</small></span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Est. Time</span>
            <span className="text-3xl font-bold text-cdtext font-mono">{calc.time}</span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">VAM</span>
            <span className="text-3xl font-bold text-cdtext">{calc.vam} <small className="text-sm text-cdmuted">m/h</small></span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1" title="Dr. Ferrari Formula (Gradient corrected)">Ferrari Eq. Power</span>
            <span className="text-3xl font-bold text-orange-400">{calc.ferrariWatts} <small className="text-sm text-orange-600">W</small></span>
            <span className="text-[10px] text-cdmuted">{calc.ferrariWkg} W/kg</span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Energy / Work</span>
            <span className="text-3xl font-bold text-blue-400">
              {calc.watts > 0 ? Math.round((calc.watts * parseDurationToSeconds(calc.time)) / 1000) : 0}
              <small className="text-sm text-blue-600"> kJ</small>
            </span>
            <span className="text-[10px] text-cdmuted">~{calc.watts > 0 ? Math.round((calc.watts * parseDurationToSeconds(calc.time)) / 1000) : 0} kCal</span>
          </div>

          <div className="col-span-2 bg-cdbg p-4 rounded-lg border border-cdborder">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-cdtext">Intensity Zone</span>
              {calc.zone && <span style={{ color: calc.zone.color }} className="font-bold text-sm uppercase">{calc.zone.name}</span>}
            </div>

            <div className="w-full h-6 bg-cdsurface rounded-full overflow-hidden flex relative mb-1">
              {COGGAN_ZONES.map((z, i) => (
                <div
                  key={i}
                  style={{ width: `${calculateZoneWidth(z)}%`, background: z.color }}
                  className="h-full opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center"
                  title={`${z.name} (${Math.round(z.min * 100)}% - ${Math.round(z.max * 100 > 200 ? '>150' : z.max * 100)}%)`}
                >
                  {/* Only show label if width is sufficient (>10%) */}
                  {calculateZoneWidth(z) > 10 && <span className="text-[9px] font-bold text-cdtext/80 drop-shadow-md truncate px-1">{z.id}</span>}
                </div>
              ))}
            </div>

            <div className="relative w-full h-2">
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
