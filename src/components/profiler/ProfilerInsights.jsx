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
                    Tactische referenties
                </h3>
                <ul className="space-y-2">
                    {sorted.map((zone, idx) => (
                        <li
                            key={`${zone.type}-${idx}`}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm ${zoneStyle(zone.type)}`}
                        >
                            <span className="font-mono text-xs text-cdmuted w-14 shrink-0 pt-0.5">
                                {zone.km.toFixed(1)} km
                            </span>
                            <span className="flex-1 leading-snug">{zone.label}</span>
                            {zone.type === 'steep' && (
                                <span className="text-[10px] uppercase tracking-wide text-red-400/90 shrink-0">
                                    spanning
                                </span>
                            )}
                            {zone.type === 'recovery' && (
                                <span className="text-[10px] uppercase tracking-wide text-emerald-400/90 shrink-0">
                                    herstel
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                <h4 className="text-cdtext font-bold text-sm mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-blue-400 shrink-0" />
                    Pacing &amp; energiebeheer
                </h4>
                <ul className="text-sm text-cdtext space-y-2.5 leading-relaxed">
                    <li className="flex gap-2">
                        <Mountain size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Start:</strong> kalm instappen; bouw in de eerste minuten
                            richting je doelintensiteit (~{Math.round(ftp * (intensityPct / 100))} W).
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Steil:</strong> houd het vermogen stabiel en laat de snelheid
                            zakken — vooral bij hellingen boven ~10%.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Vlakkere stukken:</strong> optioneel iets drukken (
                            ~{pushFlat} W) om tijd te winnen zonder de steile delen te verbranden.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Gauge size={14} className="text-cdmuted shrink-0 mt-0.5" />
                        <span>
                            <strong className="text-cdtext">Afronding:</strong> als je nog reserve hebt, laatste km naar
                            threshold (~{finish} W).
                        </span>
                    </li>
                </ul>
                {pacingMetrics?.energyKj > 0 && (
                    <p className="mt-4 text-xs text-cdmuted border-t border-cdborder pt-3">
                        Indicatieve mechanische arbeid bij dit doelvermogen:{' '}
                        <strong className="text-cdtext">{pacingMetrics.energyKj.toLocaleString('nl-NL')} kJ</strong> — géén
                        voedingsadvies; add ~25% voor rendementsverliezen.
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProfilerInsights;
