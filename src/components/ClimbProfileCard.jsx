import React from 'react';
import { Map } from 'lucide-react';

const ClimbProfileCard = ({ climb }) => {
    if (!climb) return null;
    
    const sectors = [
        { name: 'Start', km: '0 - ' + (climb.lengthKm * 0.3).toFixed(1), grade: (climb.avgGrade * 0.8).toFixed(1), focus: 'Find rhythm, control HR' },
        { name: 'Middle', km: (climb.lengthKm * 0.3).toFixed(1) + ' - ' + (climb.lengthKm * 0.8).toFixed(1), grade: (climb.avgGrade * 1.1).toFixed(1), focus: 'Sweetspot power, aero posture' },
        { name: 'Finale', km: (climb.lengthKm * 0.8).toFixed(1) + ' - Top', grade: (climb.avgGrade * 1.2).toFixed(1), focus: 'Empty the tank, out of saddle' },
    ];

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder h-full animate-in fade-in">
            <h3 className="text-lg font-bold text-cdtext flex items-center gap-2 mb-4">
                <Map className="text-yellow-400" size={20}/> Tactical Profile: {climb.name}
            </h3>
            
            <div className="flex gap-4 mb-6">
                 <div className="bg-cdbg p-3 rounded flex-1 text-center">
                    <div className="text-xs text-cdmuted uppercase">Length</div>
                    <div className="text-xl font-bold text-cdtext">{climb.lengthKm} km</div>
                 </div>
                 <div className="bg-cdbg p-3 rounded flex-1 text-center">
                    <div className="text-xs text-cdmuted uppercase">Elevation</div>
                    <div className="text-xl font-bold text-cdtext">{climb.elevation} m</div>
                 </div>
                 <div className="bg-cdbg p-3 rounded flex-1 text-center">
                    <div className="text-xs text-cdmuted uppercase">Avg Grade</div>
                    <div className="text-xl font-bold text-yellow-400">{climb.avgGrade}%</div>
                 </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs uppercase text-cdmuted font-bold mb-2">Key Sectors</h4>
                {sectors.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-cdbg/50 rounded border-l-2 border-yellow-400">
                        <div>
                            <span className="text-cdtext font-bold text-sm block">{s.name}</span>
                            <span className="text-xs text-cdmuted">{s.km} km</span>
                        </div>
                        <div className="text-right">
                             <span className="text-yellow-400 font-bold block">{s.grade}%</span>
                             <span className="text-[10px] text-cdmuted">{s.focus}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClimbProfileCard;