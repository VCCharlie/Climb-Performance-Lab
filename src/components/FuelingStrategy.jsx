import React, { useState, useMemo } from 'react';
import { Utensils, Zap, Droplets, Battery, CheckCircle } from 'lucide-react';

const FuelingStrategy = () => {
    const [duration, setDuration] = useState(180); 
    const [intensity, setIntensity] = useState(0.85);
    const [bidonSize, setBidonSize] = useState(750);

    const requirements = useMemo(() => {
        const carbsPerHour = intensity > 0.9 ? 90 : intensity > 0.8 ? 75 : 60;
        const totalCarbs = (duration / 60) * carbsPerHour;
        const fluidPerHour = 600;
        const totalFluid = (duration / 60) * fluidPerHour;
        const totalBidons = Math.ceil(totalFluid / bidonSize); 
        const fluidCarbs = totalBidons * 40; 
        const remainingCarbs = Math.max(0, totalCarbs - fluidCarbs);
        const gels = Math.round((remainingCarbs * 0.6) / 30);
        const bars = Math.round((remainingCarbs * 0.4) / 45);

        return { carbsPerHour, totalCarbs, fluidPerHour, totalFluid, totalBidons, gels, bars };
    }, [duration, intensity, bidonSize]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl animate-in fade-in">
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
                    <div>
                         <label className="text-xs text-slate-400 uppercase font-bold">Bidon Grootte</label>
                         <div className="flex bg-slate-900 rounded p-1 mt-2 w-fit">
                            <button onClick={()=>setBidonSize(500)} className={`px-4 py-1 text-xs rounded ${bidonSize===500 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>500ml</button>
                            <button onClick={()=>setBidonSize(750)} className={`px-4 py-1 text-xs rounded ${bidonSize===750 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>750ml</button>
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
                                <div className="text-lg font-bold text-white">{Math.round(requirements.totalCarbs)}g</div>
                                <div className="text-[10px] text-slate-400">Total Load</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="relative bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col justify-between">
                    <div>
                         <h3 className="text-slate-300 font-bold mb-4 uppercase tracking-wider flex items-center gap-2"><CheckCircle size={16}/> Packing List</h3>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded text-blue-400"><Droplets size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.totalBidons}x</div>
                                        <div className="text-xs text-slate-400">Bidons ({bidonSize}ml) met Mix</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded text-yellow-400"><Zap size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.gels}x</div>
                                        <div className="text-xs text-slate-400">Energy Gels (30g)</div>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-500/20 p-2 rounded text-green-400"><Utensils size={20}/></div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{requirements.bars}x</div>
                                        <div className="text-xs text-slate-400">Solid Bars (45g)</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FuelingStrategy;