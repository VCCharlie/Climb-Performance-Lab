import React from 'react';
import { MapPin, Lightbulb, Gauge, Mountain } from 'lucide-react';

const zoneStyle = (type) => {
    if (type === 'steep') {
        return 'bg-red-500/10 border-red-500/25 text-cdtext';
    }
    if (type === 'recovery') {
        return 'bg-emerald-500/10 border-emerald-500/25 text-cdtext';
    }
    return 'bg-cdaccent/10 border-cdaccent/30 text-cdtext';
};

const ProfilerInsights = ({ tacticalZones, ftp, intensityPct, pacingMetrics }) => {
    const sorted = [...tacticalZones].sort((a, b) => a.km - b.km);
    const pushFlat = Math.round(ftp * Math.min(intensityPct / 100 + 0.07, 1.12));
    const finish = Math.round(ftp);

    return (
        <div className="space-y-5">
            <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                <h3 className="text-cdtext font-bold text-sm mb-3 tracking-wide flex items-center gap-2">
                    <MapPin size={16} className="text-cdaccent shrink-0" />
                    Tactical references
                </h3>
                <ul className="space-y-2">
                    {sorted.map((zone, idx) => (
                        <li
                            key={`${zone.type}-${idx}`}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm ${zoneStyle(zone.type)}`}
                        >
                            <span className="tabular-nums text-xs text-cdmuted w-14 shrink-0 pt-0.5">
                                {zone.km.toFixed(1)} km
                            </span>
                            <span className="flex-1 leading-snug">{zone.label}</span>
                            {zone.type === 'steep' && (
                                <span className="text-[10px] uppercase tracking-wide text-red-400/90 shrink-0">
                                    stress
                                </span>
                            )}
                            {zone.type === 'recovery' && (
                                <span className="text-[10px] uppercase tracking-wide text-emerald-400/90 shrink-0">
                                    recovery
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                <h4 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-blue-400 shrink-0" />
                    Pacing &amp; energy management
                </h4>
                <ul className="text-sm text-cdtext space-y-2.5 leading-relaxed">
                    <li className="flex gap-2">
                        <Mountain size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Start:</strong> ease in calmly; build toward your target
                            intensity in the first minutes (~{Math.round(ftp * (intensityPct / 100))} W).
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Steep:</strong> keep power steady and let speed
                            drop — especially on gradients above ~10%.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Flatter sections:</strong> optionally push a bit harder (
                            ~{pushFlat} W) to gain time without burning out on the steep parts.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Finish:</strong> if you still have reserves, push the last km toward
                            threshold (~{finish} W).
                        </span>
                    </li>
                </ul>
                {pacingMetrics?.energyKj > 0 && (
                    <p className="mt-4 text-xs text-cdmuted border-t border-cdborder pt-3">
                        Indicative mechanical work at this target power:{' '}
                        <strong className="text-cdtext">{pacingMetrics.energyKj.toLocaleString('nl-NL')} kJ</strong> — not
                        nutrition advice; add ~25% for efficiency losses.
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProfilerInsights;
