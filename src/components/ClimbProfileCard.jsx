import React from 'react';
import { Map, Mountain, Ruler, TrendingUp } from 'lucide-react';

const ClimbProfileCard = ({ climb }) => {
    if (!climb) return null;

    const sectors = [
        {
            name: 'Begin',
            km: `0 – ${(climb.lengthKm * 0.3).toFixed(1)} km`,
            grade: (climb.avgGrade * 0.8).toFixed(1),
            focus: 'Ritme zoeken, ademhaling onder controle'
        },
        {
            name: 'Midden',
            km: `${(climb.lengthKm * 0.3).toFixed(1)} – ${(climb.lengthKm * 0.8).toFixed(1)} km`,
            grade: (climb.avgGrade * 1.1).toFixed(1),
            focus: 'Sweet spot / tempo, aerodynamische houding'
        },
        {
            name: 'Finale',
            km: `${(climb.lengthKm * 0.8).toFixed(1)} km – top`,
            grade: (climb.avgGrade * 1.2).toFixed(1),
            focus: 'Indien reserve: uit het zadel of versnelling licht verlagen'
        }
    ];

    return (
        <div className="bg-cdsurface p-5 md:p-6 rounded-xl border border-cdborder h-full flex flex-col animate-in fade-in">
            <div className="border-b border-cdborder pb-4 mb-4">
                <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                    <Map className="text-cdaccent shrink-0" size={20} />
                    Sectoren
                </h3>
                <p className="text-xs text-cdmuted mt-2 leading-relaxed">
                    Globale fasering op basis van afstand — combineer met het hellingsprofiel links voor je pacing.
                </p>
            </div>

            <div className="flex gap-2 mb-5">
                <div className="bg-cdbg/70 flex-1 rounded-lg border border-cdborder p-3 text-center">
                    <Ruler className="w-4 h-4 text-cdmuted mx-auto mb-1" />
                    <div className="text-[10px] text-cdmuted uppercase tracking-wide">Lengte</div>
                    <div className="text-lg font-bold text-cdtext tabular-nums">{climb.lengthKm} km</div>
                </div>
                <div className="bg-cdbg/70 flex-1 rounded-lg border border-cdborder p-3 text-center">
                    <Mountain className="w-4 h-4 text-cdmuted mx-auto mb-1" />
                    <div className="text-[10px] text-cdmuted uppercase tracking-wide">H+</div>
                    <div className="text-lg font-bold text-cdtext tabular-nums">{climb.elevation} m</div>
                </div>
                <div className="bg-cdbg/70 flex-1 rounded-lg border border-cdborder p-3 text-center">
                    <TrendingUp className="w-4 h-4 text-cdmuted mx-auto mb-1" />
                    <div className="text-[10px] text-cdmuted uppercase tracking-wide">Gem.</div>
                    <div className="text-lg font-bold text-cdaccent tabular-nums">{climb.avgGrade}%</div>
                </div>
            </div>

            <div className="space-y-2 flex-1">
                <h4 className="text-[11px] uppercase text-cdmuted font-bold tracking-wider">Focus per sector</h4>
                {sectors.map((s, i) => (
                    <div
                        key={i}
                        className="p-3 rounded-lg border border-cdborder bg-cdbg/40 border-l-[3px] border-l-cdaccent"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-cdtext font-bold text-sm">{s.name}</span>
                            <span className="text-cdaccent font-bold text-sm tabular-nums">{s.grade}%</span>
                        </div>
                        <div className="text-[11px] text-cdmuted mt-1">{s.km}</div>
                        <p className="text-xs text-cdtext/90 mt-2 leading-snug">{s.focus}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClimbProfileCard;
