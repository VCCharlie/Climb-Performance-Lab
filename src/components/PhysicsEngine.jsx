import React, { useState, useMemo, useCallback, useId } from 'react';
import {
  Mountain,
  Info,
  Minus,
  Plus,
  Lightbulb,
  Gauge,
  Zap,
  ArrowUpRight,
  GitCompare,
  Timer,
  Flame,
  Ruler
} from 'lucide-react';
import { COGGAN_ZONES } from '../climbs';
import { summarizeClimbPhysics } from '../utils';
import ClimbSelector from './shared/ClimbSelector';
import {
  computePhysicsClimb,
  estimateSteadyTss,
  formatSignedInt,
  formatSignedDuration,
  addSecondsToTimeStr,
  horizontalDistanceDeltaInATimeAtBPace,
  horizontalDistanceDeltaInBTimeAtAPace,
  formatSignedHorizontalDelta,
  EMPTY_PHYSICS_CALC
} from '../utils/physicsEngineCore';

const VISUAL_MAX = 1.6;

const physicsParams = (selectedClimb, userSettings, mode, targetTimeStr, targetWatts, cda, crr, loss) => ({
  selectedClimb,
  userSettings,
  mode,
  targetTimeStr,
  targetWatts,
  cda,
  crr,
  loss
});

const PhysicsEngine = ({ userSettings, setUserSettings, selectedClimb, onUpdateClimb }) => {
  const markerFilterId = `physics-marker-glow-${useId().replace(/:/g, '')}`;

  const [mode, setMode] = useState('target');
  const [targetTimeStr, setTargetTimeStr] = useState('59:00');
  const [targetWatts, setTargetWatts] = useState(userSettings.ftp);

  const [cda, setCda] = useState(0.32);
  const [crr, setCrr] = useState(0.004);
  const [loss, setLoss] = useState(0.03);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [showCompare, setShowCompare] = useState(false);
  const [compareTimeStr, setCompareTimeStr] = useState('1:04:00');
  const [compareWattsStr, setCompareWattsStr] = useState('');

  const updateWeight = (type, delta) => {
    const current = type === 'body' ? userSettings.weight : userSettings.bikeWeight;
    const newVal = parseFloat((current + delta).toFixed(1));
    if (type === 'body') setUserSettings(prev => ({ ...prev, weight: newVal }));
    else setUserSettings(prev => ({ ...prev, bikeWeight: newVal }));
  };

  const adjustTargetTime = (deltaSeconds) => {
    setTargetTimeStr(prev => addSecondsToTimeStr(prev, deltaSeconds));
  };

  const adjustTargetWatts = (delta) => {
    setTargetWatts(prev => Math.max(0, Number(prev) + delta));
  };

  const openCompare = useCallback(() => {
    setShowCompare(true);
    if (mode === 'target') {
      setCompareTimeStr(addSecondsToTimeStr(targetTimeStr, 300));
    } else {
      const base = Number(targetWatts) || 0;
      setCompareWattsStr(String(Math.max(0, base - 25)));
    }
  }, [mode, targetTimeStr, targetWatts]);

  const bumpCompareTime = (sec) => {
    setCompareTimeStr(prev => addSecondsToTimeStr(prev, sec));
  };

  const calc = useMemo(
    () =>
      computePhysicsClimb(
        physicsParams(selectedClimb, userSettings, mode, targetTimeStr, targetWatts, cda, crr, loss)
      ),
    [selectedClimb, userSettings, mode, targetTimeStr, targetWatts, cda, crr, loss]
  );

  const compareCalc = useMemo(() => {
    if (!showCompare || !selectedClimb) return EMPTY_PHYSICS_CALC;
    if (mode === 'target') {
      return computePhysicsClimb(
        physicsParams(selectedClimb, userSettings, 'target', compareTimeStr, targetWatts, cda, crr, loss)
      );
    }
    return computePhysicsClimb(
      physicsParams(selectedClimb, userSettings, 'predict', targetTimeStr, compareWattsStr, cda, crr, loss)
    );
  }, [
    showCompare,
    selectedClimb,
    userSettings,
    mode,
    compareTimeStr,
    compareWattsStr,
    targetTimeStr,
    targetWatts,
    cda,
    crr,
    loss
  ]);

  const climbInsights = useMemo(() => {
    if (!selectedClimb) return null;
    return summarizeClimbPhysics({
      lengthKm: selectedClimb.lengthKm,
      elevation: selectedClimb.elevation,
      avgGrade: selectedClimb.avgGrade,
      ftp: userSettings.ftp,
      watts: calc.watts,
      seconds: calc.seconds,
      riderWeightKg: userSettings.weight
    });
  }, [selectedClimb, userSettings.weight, userSettings.ftp, calc.watts, calc.seconds]);

  const tssA = useMemo(
    () => estimateSteadyTss(calc.seconds, calc.watts, userSettings.ftp),
    [calc.seconds, calc.watts, userSettings.ftp]
  );
  const tssB = useMemo(
    () => estimateSteadyTss(compareCalc.seconds, compareCalc.watts, userSettings.ftp),
    [compareCalc.seconds, compareCalc.watts, userSettings.ftp]
  );

  const climbLenM = selectedClimb ? selectedClimb.lengthKm * 1000 : 0;

  const distDeltaInATime = useMemo(
    () =>
      horizontalDistanceDeltaInATimeAtBPace(climbLenM, calc.seconds, compareCalc.seconds),
    [climbLenM, calc.seconds, compareCalc.seconds]
  );

  const distDeltaInBTime = useMemo(
    () =>
      horizontalDistanceDeltaInBTimeAtAPace(climbLenM, calc.seconds, compareCalc.seconds),
    [climbLenM, calc.seconds, compareCalc.seconds]
  );

  const calculateZoneWidth = (zone) => {
    const min = Math.min(zone.min, VISUAL_MAX);
    const max = Math.min(zone.max, VISUAL_MAX);
    const width = max - min;
    return (width / VISUAL_MAX) * 100;
  };

  const zoneActive = (z) =>
    calc.zone && z.min === calc.zone.min && z.max === calc.zone.max;

  const kJ = (c) => (c.watts > 0 && c.seconds > 0 ? Math.round((c.watts * c.seconds) / 1000) : 0);

  return (
    <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
            <Mountain className="w-6 h-6" /> Physics Engine
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => (showCompare ? setShowCompare(false) : openCompare())}
              className={`text-xs font-bold px-3 py-1 rounded border flex items-center gap-1.5 ${showCompare ? 'bg-cdaccent/20 text-cdaccent border-cdaccent' : 'text-cdmuted border-cdborder hover:border-cdaccent/50'}`}
            >
              <GitCompare size={14} /> {showCompare ? 'Hide compare' : 'Compare scenarios'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-xs font-bold px-3 py-1 rounded border ${showAdvanced ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400' : 'text-cdmuted border-cdborder'}`}
            >
              Advanced Physics
            </button>
            <a
              href={selectedClimb?.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="text-cdmuted hover:text-cdtext flex items-center gap-1 text-xs"
              title="View Info"
            >
              <Info size={14} /> Climb info
            </a>
          </div>
        </div>

        {showAdvanced && (
          <div className="bg-cdbg/50 p-4 rounded-lg border border-cdborder grid grid-cols-3 gap-4 text-xs animate-in slide-in-from-top-2">
            <div>
              <label className="block text-cdmuted mb-1">CdA (Aerodrag)</label>
              <input
                type="number"
                step="0.01"
                value={cda}
                onChange={e => setCda(parseFloat(e.target.value))}
                className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-cdmuted mb-1">Crr (Rolling Res.)</label>
              <input
                type="number"
                step="0.001"
                value={crr}
                onChange={e => setCrr(parseFloat(e.target.value))}
                className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-cdmuted mb-1">Drivetrain Loss %</label>
              <input
                type="number"
                step="0.01"
                value={loss}
                onChange={e => setLoss(parseFloat(e.target.value))}
                className="w-full bg-cdsurface text-cdtext rounded p-2 border border-cdborder focus:border-yellow-400 outline-none"
              />
            </div>
          </div>
        )}

        <ClimbSelector mode="single" selected={selectedClimb} onSelect={onUpdateClimb} showCategoryBadge />

        {showCompare && selectedClimb && (
          <div className="rounded-xl border border-cdaccent/40 bg-cdaccent/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-sm font-bold text-cdtext">
              <GitCompare size={16} className="text-cdaccent shrink-0" />
              Scenario B {mode === 'target' ? '(alternate time)' : '(alternate power)'}
            </div>
            {mode === 'target' ? (
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-cdmuted font-bold block mb-1">Scenario B — target time</label>
                  <input
                    value={compareTimeStr}
                    onChange={e => setCompareTimeStr(e.target.value)}
                    className="w-full bg-cdsurface text-cdtext font-mono text-lg text-center rounded p-2 border border-cdborder focus:border-cdaccent outline-none"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => bumpCompareTime(120)}
                    className="px-2 py-1 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext"
                  >
                    B +2 min
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpCompareTime(300)}
                    className="px-2 py-1 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext"
                  >
                    B +5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareTimeStr(addSecondsToTimeStr(targetTimeStr, 300))}
                    className="px-2 py-1 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:text-cdtext"
                  >
                    Reset vs A+5m
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] uppercase text-cdmuted font-bold block mb-1">Scenario B — power (W)</label>
                <input
                  type="number"
                  value={compareWattsStr}
                  onChange={e => setCompareWattsStr(e.target.value)}
                  className="w-full max-w-xs bg-cdsurface text-cdtext font-mono text-lg text-center rounded p-2 border border-cdborder focus:border-cdaccent outline-none"
                />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold">Δ Power</span>
                <div className="text-cdtext font-mono font-bold">
                  {formatSignedInt(compareCalc.watts - calc.watts)} W
                </div>
              </div>
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold">Δ Time</span>
                <div className="text-cdtext font-mono font-bold">
                  {compareCalc.seconds > 0 && calc.seconds > 0
                    ? formatSignedDuration(compareCalc.seconds - calc.seconds)
                    : '—'}
                </div>
                <span className="text-[9px] text-cdmuted block">+ = B slower (longer)</span>
              </div>
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold flex items-center gap-1"><Ruler size={10} /> Δ Road (A’s time)</span>
                <div className="text-cdtext font-mono font-bold leading-tight">
                  {calc.seconds > 0 && compareCalc.seconds > 0
                    ? formatSignedHorizontalDelta(distDeltaInATime)
                    : '—'}
                </div>
                <span className="text-[9px] text-cdmuted block">at B’s avg speed vs climb length</span>
              </div>
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold flex items-center gap-1"><Ruler size={10} /> Δ Road (B’s time)</span>
                <div className="text-cdtext font-mono font-bold leading-tight">
                  {calc.seconds > 0 && compareCalc.seconds > 0
                    ? formatSignedHorizontalDelta(distDeltaInBTime)
                    : '—'}
                </div>
                <span className="text-[9px] text-cdmuted block">at A’s avg speed vs climb length</span>
              </div>
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold flex items-center gap-1"><Flame size={10} /> Δ VAM</span>
                <div className="text-cdtext font-mono font-bold">{formatSignedInt(compareCalc.vam - calc.vam)} m/h</div>
              </div>
              <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2">
                <span className="text-cdmuted uppercase text-[9px] font-bold">Δ Work</span>
                <div className="text-cdtext font-mono font-bold">{formatSignedInt(kJ(compareCalc) - kJ(calc))} kJ</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-cdmuted">
              <span>
                Est. steady TSS: <span className="text-cdtext font-mono font-bold">{tssA}</span> (A) vs{' '}
                <span className="text-cdtext font-mono font-bold">{tssB}</span> (B)
                {userSettings.ftp > 0 && (
                  <span className="text-cdmuted"> ({formatSignedInt(tssB - tssA)} TSS)</span>
                )}
              </span>
              <span>
                IF:{' '}
                <span className="text-cdtext font-mono">{(calc.ifRatio * 100).toFixed(1)}%</span> vs{' '}
                <span className="text-cdtext font-mono">{(compareCalc.ifRatio * 100).toFixed(1)}%</span> FTP
              </span>
            </div>
            <div className="pt-1">
              <p className="text-[10px] text-cdmuted uppercase font-bold mb-1">Relative intensity (% FTP)</p>
              <div className="relative h-10 rounded-lg bg-cdsurface border border-cdborder overflow-hidden">
                <div className="absolute inset-0 flex">
                  {COGGAN_ZONES.map((z, i) => (
                    <div
                      key={i}
                      style={{ width: `${calculateZoneWidth(z)}%`, background: z.color }}
                      className="h-full opacity-25"
                    />
                  ))}
                </div>
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 40"
                  preserveAspectRatio="none"
                >
                  <line x1="62.5" y1="4" x2="62.5" y2="36" stroke="currentColor" className="text-cdmuted/40" strokeWidth="0.35" strokeDasharray="1 1" />
                  {calc.ifRatio > 0 && (
                    <g>
                      <polygon
                        points={`${Math.min(100, (calc.ifRatio / VISUAL_MAX) * 100)},4 ${Math.min(100, (calc.ifRatio / VISUAL_MAX) * 100) - 2.2},14 ${Math.min(100, (calc.ifRatio / VISUAL_MAX) * 100) + 2.2},14`}
                        fill="#facc15"
                        stroke="#0f172a"
                        strokeWidth="0.15"
                        className="drop-shadow-md"
                      />
                      <text
                        x={Math.min(98, Math.max(4, (calc.ifRatio / VISUAL_MAX) * 100))}
                        y="32"
                        textAnchor="middle"
                        className="fill-yellow-400"
                        style={{ fontSize: '3.2px', fontWeight: 800 }}
                      >
                        A
                      </text>
                    </g>
                  )}
                  {compareCalc.ifRatio > 0 && (
                    <g>
                      <polygon
                        points={`${Math.min(100, (compareCalc.ifRatio / VISUAL_MAX) * 100)},4 ${Math.min(100, (compareCalc.ifRatio / VISUAL_MAX) * 100) - 2.2},14 ${Math.min(100, (compareCalc.ifRatio / VISUAL_MAX) * 100) + 2.2},14`}
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth="0.15"
                        className="drop-shadow-md"
                      />
                      <text
                        x={Math.min(98, Math.max(4, (compareCalc.ifRatio / VISUAL_MAX) * 100))}
                        y="38"
                        textAnchor="middle"
                        className="fill-sky-400"
                        style={{ fontSize: '3.2px', fontWeight: 800 }}
                      >
                        B
                      </text>
                    </g>
                  )}
                </svg>
              </div>
              <p className="text-[9px] text-cdmuted mt-1">Dashed line ≈ 100% FTP. TSS uses a steady-state NP≈avg approximation.</p>
            </div>
          </div>
        )}

        {selectedClimb && climbInsights && (
          <div className="rounded-xl border border-cdborder bg-cdbg/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-cdtext">
              <Lightbulb size={16} className="text-yellow-400 shrink-0" />
              Climb insights
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {climbInsights.category && (
                <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2.5">
                  <span className="text-[10px] uppercase text-cdmuted font-bold block mb-0.5">Category</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black ${climbInsights.category.className}`}>
                    {climbInsights.category.label}
                  </span>
                  <span className="text-cdmuted block mt-1 text-[10px]">{climbInsights.category.full}</span>
                </div>
              )}
              {climbInsights.pctFtp != null && userSettings.ftp > 0 && (
                <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-cdmuted font-bold flex items-center gap-1">
                    <Gauge size={11} /> vs FTP
                  </span>
                  <span className="text-lg font-bold text-yellow-400">{Math.round(climbInsights.pctFtp)}%</span>
                  <span className="text-[10px] text-cdmuted">IF {(calc.ifRatio * 100).toFixed(1)}% FTP</span>
                </div>
              )}
              {climbInsights.kJ != null && (
                <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-cdmuted font-bold flex items-center gap-1">
                    <Zap size={11} /> Work
                  </span>
                  <span className="text-lg font-bold text-cdtext">
                    {climbInsights.kJ} <span className="text-sm text-cdmuted font-normal">kJ</span>
                  </span>
                  {climbInsights.kJperKm != null && (
                    <span className="text-[10px] text-cdmuted">~{climbInsights.kJperKm} kJ/km on this climb</span>
                  )}
                </div>
              )}
              {userSettings.ftp > 0 && calc.seconds > 0 && (
                <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-cdmuted font-bold flex items-center gap-1">
                    <Timer size={11} /> Est. TSS
                  </span>
                  <span className="text-lg font-bold text-purple-400">{tssA}</span>
                  <span className="text-[10px] text-cdmuted">steady effort approx.</span>
                </div>
              )}
              {climbInsights.elevPerKm != null && (
                <div className="bg-cdsurface/80 border border-cdborder rounded-lg p-2.5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-cdmuted font-bold">Profile</span>
                  <span className="text-cdtext font-bold">{climbInsights.elevPerKm} m/km</span>
                  <span className="text-[10px] text-cdmuted">avg gradient {selectedClimb.avgGrade}%</span>
                </div>
              )}
            </div>
            {climbInsights.wkg != null && (
              <p className="text-xs text-cdmuted">
                Rider power: <span className="text-cdtext font-mono font-bold">{calc.watts} W</span> (
                {climbInsights.wkg.toFixed(2)} W/kg) · VAM <span className="text-cdtext font-mono">{calc.vam}</span> m/h
              </p>
            )}
            {climbInsights.gradientNote && (
              <p className="text-xs text-cdmuted border-l-2 border-yellow-400/50 pl-3 py-0.5">{climbInsights.gradientNote}</p>
            )}
            {selectedClimb.url && (
              <a
                href={selectedClimb.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cdaccent hover:underline font-bold"
              >
                External climb info <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-cdbg p-4 rounded-lg border border-cdborder space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-cdtext">Rider</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateWeight('body', -0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600">
                  <Minus size={14} />
                </button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.weight.toFixed(1)} kg</span>
                <button type="button" onClick={() => updateWeight('body', 0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-cdtext">Bike</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateWeight('bike', -0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600">
                  <Minus size={14} />
                </button>
                <span className="font-mono w-16 text-center text-yellow-400">{userSettings.bikeWeight.toFixed(1)} kg</span>
                <button type="button" onClick={() => updateWeight('bike', 0.1)} className="p-1 bg-cdborder rounded hover:bg-slate-600">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-cdborder rounded-lg p-1 flex">
            <button
              type="button"
              onClick={() => setMode('target')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'target' ? 'bg-yellow-400 text-slate-900' : 'text-cdtext'}`}
            >
              Target Time
            </button>
            <button
              type="button"
              onClick={() => setMode('predict')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded ${mode === 'predict' ? 'bg-yellow-400 text-slate-900' : 'text-cdtext'}`}
            >
              Predict
            </button>
          </div>

          <div className="bg-cdbg border border-yellow-400/30 p-4 rounded-lg">
            <label className="text-xs text-yellow-400 uppercase font-bold mb-2 block">
              {mode === 'target' ? 'Scenario A — desired time' : 'Scenario A — sustainable power'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (mode === 'target' ? adjustTargetTime(-1) : adjustTargetWatts(-1))}
                className="p-2 bg-cdsurface rounded hover:bg-cdborder text-cdmuted hover:text-cdtext transition-colors"
              >
                <Minus size={20} />
              </button>

              {mode === 'target' ? (
                <input
                  value={targetTimeStr}
                  onChange={e => setTargetTimeStr(e.target.value)}
                  className="w-full bg-transparent text-3xl font-mono text-center text-cdtext outline-none border-b border-transparent focus:border-yellow-400"
                />
              ) : (
                <input
                  type="number"
                  value={targetWatts}
                  onChange={e => setTargetWatts(e.target.value)}
                  className="w-full bg-transparent text-3xl font-mono text-center text-cdtext outline-none border-b border-transparent focus:border-yellow-400"
                />
              )}

              <button
                type="button"
                onClick={() => (mode === 'target' ? adjustTargetTime(1) : adjustTargetWatts(1))}
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
            <span className="text-3xl font-bold text-cdtext">
              {calc.watts} <small className="text-sm text-cdmuted">W</small>
            </span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Power / Weight</span>
            <span className="text-3xl font-bold text-yellow-400">
              {calc.wkg} <small className="text-sm text-yellow-600">W/kg</small>
            </span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Est. Time</span>
            <span className="text-3xl font-bold text-cdtext font-mono">{calc.time}</span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">VAM</span>
            <span className="text-3xl font-bold text-cdtext">
              {calc.vam} <small className="text-sm text-cdmuted">m/h</small>
            </span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1" title="Dr. Ferrari Formula (Gradient corrected)">
              Ferrari Eq. Power
            </span>
            <span className="text-3xl font-bold text-orange-400">
              {calc.ferrariWatts} <small className="text-sm text-orange-600">W</small>
            </span>
            <span className="text-[10px] text-cdmuted">{calc.ferrariWkg} W/kg</span>
          </div>
          <div className="bg-cdborder/50 p-4 rounded-lg flex flex-col items-center justify-center border border-cdborder">
            <span className="text-xs text-cdmuted uppercase mb-1">Energy / Work</span>
            <span className="text-3xl font-bold text-blue-400">
              {kJ(calc)}
              <small className="text-sm text-blue-600"> kJ</small>
            </span>
            <span className="text-[10px] text-cdmuted">~{kJ(calc)} kCal</span>
          </div>

          <div className="col-span-2 bg-cdbg p-4 rounded-lg border border-cdborder">
            <div className="flex justify-between items-end mb-2 gap-2 flex-wrap">
              <span className="text-sm font-bold text-cdtext">Intensity Zone</span>
              {calc.zone && (
                <span
                  className="font-bold text-sm uppercase px-2 py-0.5 rounded-md border border-cdborder"
                  style={{
                    color: calc.zone.color,
                    backgroundColor: `${calc.zone.color}22`,
                    boxShadow: `0 0 12px ${calc.zone.color}55`
                  }}
                >
                  {calc.zone.name}
                </span>
              )}
            </div>

            <div className="w-full h-7 bg-cdsurface rounded-full overflow-hidden flex relative mb-0 shadow-inner border border-cdborder/80">
              {COGGAN_ZONES.map((z, i) => {
                const active = zoneActive(z);
                return (
                  <div
                    key={i}
                    style={{ width: `${calculateZoneWidth(z)}%`, background: z.color }}
                    className={`h-full flex items-center justify-center transition-all duration-300 ${
                      active ? 'opacity-100 z-[2] ring-2 ring-white ring-inset shadow-[inset_0_0_12px_rgba(255,255,255,0.35)]' : 'opacity-35 hover:opacity-55'
                    }`}
                    title={`${z.name} (${Math.round(z.min * 100)}%–${Math.round(z.max * 100 > 200 ? 150 : z.max * 100)}% FTP)`}
                  >
                    {calculateZoneWidth(z) > 10 && (
                      <span
                        className={`text-[9px] font-black truncate px-0.5 drop-shadow-sm ${active ? 'text-white' : 'text-cdtext/70'}`}
                      >
                        {z.id}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative w-full mt-1" style={{ height: '22px' }}>
              <svg
                width="100%"
                height="22"
                viewBox="0 0 100 22"
                preserveAspectRatio="none"
                className="overflow-visible block"
                aria-hidden
              >
                <defs>
                  <filter id={markerFilterId} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#fff" floodOpacity="0.9" />
                  </filter>
                </defs>
                {userSettings.ftp > 0 && calc.ifRatio > 0 && (
                  <polygon
                    filter={`url(#${markerFilterId})`}
                    points={`${Math.min(99.2, Math.max(0.8, (calc.ifRatio / VISUAL_MAX) * 100))},1 ${Math.min(99.2, Math.max(0.8, (calc.ifRatio / VISUAL_MAX) * 100)) - 3.2},18 ${Math.min(99.2, Math.max(0.8, (calc.ifRatio / VISUAL_MAX) * 100)) + 3.2},18`}
                    fill={calc.zone?.color || '#facc15'}
                    stroke="#0f172a"
                    strokeWidth="0.35"
                  />
                )}
              </svg>
            </div>
            <p className="text-[10px] text-cdmuted mt-0.5">
              ▼ Marker = your scenario ({(calc.ifRatio * 100).toFixed(1)}% FTP). Bar segment for your zone is highlighted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicsEngine;
