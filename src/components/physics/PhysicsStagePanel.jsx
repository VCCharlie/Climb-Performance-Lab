import React, { useMemo, useState } from 'react';
import { Mountain, Trash2, Clock, Zap, Flame, Route } from 'lucide-react';
import ClimbSelector from '../shared/ClimbSelector';
import FlagIcon from '../FlagIcon';
import {
    simulatePhysicsStage,
    stageWattsFromIntensity,
    formatStageDuration,
} from '../../utils/physicsStageSimulator';

/**
 * Tour-style multi-climb day simulator using the same physics model as single-climb mode.
 */
const PhysicsStagePanel = ({ userSettings, cda, crr, loss }) => {
    const [selectedClimbs, setSelectedClimbs] = useState([]);
    const [recoveryMinutes, setRecoveryMinutes] = useState({});
    const [targetIntensity, setTargetIntensity] = useState(0.85);
    const [defaultRecoveryMinutes, setDefaultRecoveryMinutes] = useState(15);

    const ftp = Number(userSettings?.ftp) || 0;
    const stageWatts = stageWattsFromIntensity(ftp, targetIntensity);

    const stage = useMemo(
        () =>
            simulatePhysicsStage({
                climbs: selectedClimbs,
                userSettings,
                watts: stageWatts,
                recoveryMinutesById: recoveryMinutes,
                defaultRecoveryMinutes,
                cda,
                crr,
                loss,
            }),
        [selectedClimbs, userSettings, stageWatts, recoveryMinutes, defaultRecoveryMinutes, cda, crr, loss],
    );

    const addClimb = (climb) => {
        if (!climb || selectedClimbs.some((c) => c.id === climb.id)) return;
        setSelectedClimbs((prev) => [...prev, climb]);
        setRecoveryMinutes((prev) => ({ ...prev, [climb.id]: defaultRecoveryMinutes }));
    };

    const removeClimb = (climbId) => {
        setSelectedClimbs((prev) => prev.filter((c) => c.id !== climbId));
        setRecoveryMinutes((prev) => {
            const next = { ...prev };
            delete next[climbId];
            return next;
        });
    };

    return (
        <div className="rounded-xl border border-cdaccent/40 bg-cdaccent/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-cdtext">
                    <Route size={16} className="text-cdaccent shrink-0" aria-hidden />
                    Stage simulator
                </div>
                <p className="text-[10px] text-cdmuted">
                    Chain climbs with recovery — same physics as single-climb mode.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] uppercase text-cdmuted font-bold block mb-1">
                        Stage intensity ({Math.round(targetIntensity * 100)}% FTP → {stageWatts} W)
                    </label>
                    <input
                        type="range"
                        min={0.5}
                        max={1.1}
                        step={0.01}
                        value={targetIntensity}
                        onChange={(e) => setTargetIntensity(Number(e.target.value))}
                        className="w-full accent-cdaccent"
                    />
                </div>
                <div>
                    <label className="text-[10px] uppercase text-cdmuted font-bold block mb-1">
                        Default recovery between climbs (min)
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={120}
                        step={5}
                        value={defaultRecoveryMinutes}
                        onChange={(e) => setDefaultRecoveryMinutes(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-cdsurface text-cdtext tabular-nums text-center rounded p-2 border border-cdborder focus:border-cdaccent outline-none"
                    />
                </div>
            </div>

            <ClimbSelector mode="multi" onSelect={addClimb} showCategoryBadge />

            {selectedClimbs.length === 0 ? (
                <p className="text-xs text-cdmuted text-center py-4 border border-dashed border-cdborder rounded-lg">
                    Add climbs above to build a stage (e.g. multiple cols on a long ride).
                </p>
            ) : (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">
                        Stage order ({selectedClimbs.length} climbs)
                    </p>
                    {selectedClimbs.map((climb, idx) => (
                        <div
                            key={climb.id}
                            className="bg-cdsurface border border-cdborder rounded-lg p-3 flex flex-wrap items-center gap-3"
                        >
                            <span className="text-xs font-bold text-cdaccent w-6">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-cdtext truncate">
                                    <FlagIcon country={climb.country} size="sm" />
                                    {climb.name}
                                </p>
                                <p className="text-[10px] text-cdmuted">
                                    {climb.lengthKm} km · {climb.elevation} m · {climb.avgGrade}%
                                </p>
                            </div>
                            {idx < selectedClimbs.length - 1 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-cdmuted">Recovery after:</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={120}
                                        step={5}
                                        value={recoveryMinutes[climb.id] ?? defaultRecoveryMinutes}
                                        onChange={(e) =>
                                            setRecoveryMinutes((prev) => ({
                                                ...prev,
                                                [climb.id]: Math.max(0, Number(e.target.value) || 0),
                                            }))
                                        }
                                        className="w-16 bg-cdbg text-cdtext text-center rounded border border-cdborder p-1 tabular-nums"
                                        aria-label={`Recovery after ${climb.name}`}
                                    />
                                    <span className="text-cdmuted">min</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removeClimb(climb.id)}
                                className="text-cdmuted hover:text-red-400 p-1"
                                aria-label={`Remove ${climb.name}`}
                            >
                                <Trash2 size={16} aria-hidden />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {stage && (
                <div className="space-y-4 border-t border-cdborder/50 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="rounded-lg border border-cdborder/60 bg-cdsurface/80 px-2 py-2">
                            <div className="text-lg font-bold text-cdtext tabular-nums flex items-center justify-center gap-1">
                                <Clock size={14} className="text-cdaccent" aria-hidden />
                                {stage.totals.totalMovingTime}
                            </div>
                            <div className="text-[10px] text-cdmuted uppercase">Total time</div>
                        </div>
                        <div className="rounded-lg border border-cdborder/60 bg-cdsurface/80 px-2 py-2">
                            <div className="text-lg font-bold text-cdtext tabular-nums flex items-center justify-center gap-1">
                                <Mountain size={14} className="text-cdaccent" aria-hidden />
                                {stage.totals.totalElevationM} m
                            </div>
                            <div className="text-[10px] text-cdmuted uppercase">Elevation</div>
                        </div>
                        <div className="rounded-lg border border-cdborder/60 bg-cdsurface/80 px-2 py-2">
                            <div className="text-lg font-bold text-cdtext tabular-nums flex items-center justify-center gap-1">
                                <Zap size={14} className="text-cdaccent" aria-hidden />
                                {stage.totals.totalTss}
                            </div>
                            <div className="text-[10px] text-cdmuted uppercase">Est. TSS</div>
                        </div>
                        <div className="rounded-lg border border-cdborder/60 bg-cdsurface/80 px-2 py-2">
                            <div className="text-lg font-bold text-cdtext tabular-nums flex items-center justify-center gap-1">
                                <Flame size={14} className="text-cdaccent" aria-hidden />
                                {stage.totals.totalKj} kJ
                            </div>
                            <div className="text-[10px] text-cdmuted uppercase">Mechanical work</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-cdborder/50">
                        <table className="w-full text-[11px] text-left">
                            <thead className="bg-cdbg/50 text-cdmuted uppercase tracking-wide text-[10px]">
                                <tr>
                                    <th className="px-2 py-1.5 font-bold">#</th>
                                    <th className="px-2 py-1.5 font-bold">Climb</th>
                                    <th className="px-2 py-1.5 font-bold text-right">Start</th>
                                    <th className="px-2 py-1.5 font-bold text-right">Climb</th>
                                    <th className="px-2 py-1.5 font-bold text-right">W</th>
                                    <th className="px-2 py-1.5 font-bold text-right">VAM</th>
                                    <th className="px-2 py-1.5 font-bold text-right">TSS</th>
                                    <th className="px-2 py-1.5 font-bold text-right">Recovery</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cdborder/30">
                                {stage.segments.map((seg) => (
                                    <tr key={seg.climb.id} className="text-cdtext">
                                        <td className="px-2 py-1.5 text-cdmuted">{seg.index}</td>
                                        <td className="px-2 py-1.5">
                                            <span className="font-semibold">{seg.climb.name}</span>
                                        </td>
                                        <td className="px-2 py-1.5 tabular-nums text-right tabular-nums text-cdmuted">
                                            {formatStageDuration(seg.startOffsetSeconds)}
                                        </td>
                                        <td className="px-2 py-1.5 tabular-nums text-right tabular-nums">
                                            {seg.climbTime}
                                        </td>
                                        <td className="px-2 py-1.5 tabular-nums text-right tabular-nums">
                                            {seg.watts}
                                        </td>
                                        <td className="px-2 py-1.5 tabular-nums text-right tabular-nums text-cdmuted">
                                            {seg.vam}
                                        </td>
                                        <td className="px-2 py-1.5 tabular-nums text-right tabular-nums">
                                            {seg.tss}
                                            {seg.recoveryTss > 0 ? ` +${seg.recoveryTss}` : ''}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-cdmuted tabular-nums">
                                            {seg.recoveryMinutes > 0 ? `${seg.recoveryMinutes} min` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-[10px] text-cdmuted leading-snug">
                        Climb time uses steady {stageWatts} W ({Math.round(targetIntensity * 100)}% FTP).
                        Recovery between climbs assumes easy flat riding at ~55% FTP for TSS estimates.
                        No recovery block after the final climb.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PhysicsStagePanel;
