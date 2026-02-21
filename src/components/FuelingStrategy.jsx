import React, { useState, useMemo } from 'react';
import { Utensils, Zap, Droplets, Battery, CheckCircle, Thermometer, CloudRain, Mountain, Clock } from 'lucide-react';

const FuelingStrategy = ({ initialDuration, initialIntensity }) => {
    // --- BASIC INPUTS ---
    const [duration, setDuration] = useState(initialDuration || 180); // minutes
    const [intensity, setIntensity] = useState(initialIntensity || 0.85); // IF

    // Update when props change (from RacePacing export)
    React.useEffect(() => {
        if (initialDuration) setDuration(initialDuration);
        if (initialIntensity) setIntensity(initialIntensity);
    }, [initialDuration, initialIntensity]);

    // --- EQUIPMENT ---
    const [bidonSize, setBidonSize] = useState(750); // ml

    // --- ENVIRONMENTAL FACTORS ---
    const [temp, setTemp] = useState(20); // Celsius
    const [humidity, setHumidity] = useState('medium'); // low, medium, high
    const [altitude, setAltitude] = useState(0); // meters

    // --- NUTRITION PRODUCT CONFIG ---
    const [productConfig, setProductConfig] = useState({
        drinkMixCarbs: 40, // g per bidon (e.g. Isotonic)
        gelCarbs: 30,      // g per gel (e.g. Maurten/SIS)
        barCarbs: 45       // g per bar (e.g. Clif Bar)
    });

    const calculateStrategy = useMemo(() => {
        // 1. Calculate Carbs Needs (Elite Guidelines)
        // < 1h: small amounts / rinse
        // 1-2h: 30-60g/hr
        // 2-3h: 60-75g/hr
        // > 3h: 90g/hr (if gut trained)
        let recommendedCarbsPerHour = 60;
        if (duration <= 60) recommendedCarbsPerHour = 30;
        else if (duration <= 120) recommendedCarbsPerHour = 60;
        else if (duration <= 180) recommendedCarbsPerHour = 75;
        else recommendedCarbsPerHour = 90;

        // Adjust for intensity (Higher intensity = emphasis on liquid/gels, less bars)
        if (intensity > 0.9) recommendedCarbsPerHour = 90;

        // 2. Calculate Fluid Needs (Sweat Rate Estimation)
        // Base: 500ml/hr
        let fluidBase = 500;

        // Temp Correction
        // +15ml per degree > 15C
        if (temp > 15) fluidBase += (temp - 15) * 15;

        // Humidity Correction
        if (humidity === 'high') fluidBase *= 1.1; // +10%
        if (humidity === 'low') fluidBase *= 1.2; // +20% (Dry air evaporates faster, deception)

        // Intensity Correction
        // Harder effort = more heat
        fluidBase *= intensity;

        // Altitude Correction (>1500m)
        // Drier air + increased respiration
        if (altitude > 1500) fluidBase += 100;

        const fluidPerHour = Math.round(fluidBase);

        // Totals
        const durationHours = duration / 60;
        const totalCarbsNeeded = Math.round(durationHours * recommendedCarbsPerHour);
        const totalFluidNeeded = Math.round(durationHours * fluidPerHour);

        // 3. Packing List Logic
        const totalBidons = Math.ceil(totalFluidNeeded / bidonSize);
        const carbsFromDrink = totalBidons * productConfig.drinkMixCarbs;

        const remainingCarbs = Math.max(0, totalCarbsNeeded - carbsFromDrink);

        // Solid vs Liquid Split
        // High Intensity (>0.85) -> 80% Gels, 20% Bars
        // Low Intensity (<0.75) -> 40% Gels, 60% Bars
        let gelRatio = 0.6;
        if (intensity > 0.85) gelRatio = 0.9;
        if (intensity < 0.75) gelRatio = 0.4;

        const carbsFromGels = remainingCarbs * gelRatio;
        const carbsFromBars = remainingCarbs * (1 - gelRatio);

        const gelsCount = Math.ceil(carbsFromGels / productConfig.gelCarbs);
        const barsCount = Math.ceil(carbsFromBars / productConfig.barCarbs);

        return {
            carbsPerHour: recommendedCarbsPerHour,
            fluidPerHour: fluidPerHour,
            totalCarbs: totalCarbsNeeded,
            totalFluid: totalFluidNeeded,
            packing: {
                bidons: totalBidons,
                gels: gelsCount,
                bars: barsCount,
                mixName: `${productConfig.drinkMixCarbs}g Mix`,
                gelName: `${productConfig.gelCarbs}g Gel`,
                barName: `${productConfig.barCarbs}g Bar`
            }
        };
    }, [duration, intensity, bidonSize, temp, humidity, altitude, productConfig]);

    // Timeline Generation
    const timeline = useMemo(() => {
        const events = [];
        const startTime = 0; // minutes
        const numEvents = Math.floor(duration / 20); // Interval every 20 mins

        for (let i = 1; i <= numEvents; i++) {
            const time = i * 20;
            let action = "Drink";
            let icon = Droplets;

            // Every 40 mins roughly, take a gel/bar
            if (time % 40 === 0) {
                action = "Drink + Gel";
                icon = Zap;
            }
            // Every 60-80 mins, take solid if needed
            if (time % 80 === 0 && intensity < 0.85) {
                action = "Drink + Solid Bar";
                icon = Utensils;
            }

            events.push({ time, action, icon });
        }
        return events;
    }, [duration, intensity]);

    const handleConfigChange = (key, val) => {
        setProductConfig(prev => ({ ...prev, [key]: parseInt(val) || 0 }));
    };

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl animate-in fade-in space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2"><Utensils className="text-green-400" /> Elite Fueling Strategy</h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">Scientific Guidelines</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 lg:col-span-1">

                    {/* Activity Params */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-4">
                        <h3 className="text-xs font-bold text-cdmuted uppercase tracking-wide">Activity Profile</h3>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Duration</span>
                                <span className="font-mono text-yellow-400">{Math.floor(duration / 60)}h {duration % 60}m</span>
                            </div>
                            <input type="range" min="30" max="600" step="15" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Intensity (IF)</span>
                                <span className="font-mono text-yellow-400">{(intensity * 100).toFixed(0)}%</span>
                            </div>
                            <input type="range" min="0.5" max="1.1" step="0.01" value={intensity} onChange={e => setIntensity(parseFloat(e.target.value))} className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-red-500" />
                        </div>
                    </div>

                    {/* Environment */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-4">
                        <h3 className="text-xs font-bold text-cdmuted uppercase tracking-wide flex items-center gap-2"><Thermometer size={14} /> Environment</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-cdmuted uppercase">Temp (°C)</label>
                                <input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value))} className="w-full bg-cdsurface border-cdborder rounded text-sm text-cdtext px-2 py-1 mt-1 focus:border-yellow-400 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-cdmuted uppercase">Altitude (m)</label>
                                <input type="number" step="100" value={altitude} onChange={e => setAltitude(parseInt(e.target.value))} className="w-full bg-cdsurface border-cdborder rounded text-sm text-cdtext px-2 py-1 mt-1 focus:border-yellow-400 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-cdmuted uppercase">Humidity</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                {['low', 'medium', 'high'].map(h => (
                                    <button
                                        key={h}
                                        onClick={() => setHumidity(h)}
                                        className={`px-2 py-1 text-xs rounded uppercase ${humidity === h ? 'bg-blue-500 text-cdtext font-bold' : 'bg-cdsurface text-cdmuted hover:bg-cdborder'}`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Product Config */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-4">
                        <h3 className="text-xs font-bold text-cdmuted uppercase tracking-wide">Nutrition Products (Carbs/Unit)</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[10px] text-cdmuted">Drink Mix (g)</label>
                                <input type="number" value={productConfig.drinkMixCarbs} onChange={e => handleConfigChange('drinkMixCarbs', e.target.value)} className="w-full bg-cdsurface border-cdborder rounded text-xs text-cdtext px-2 py-1" />
                            </div>
                            <div>
                                <label className="text-[10px] text-cdmuted">Gel (g)</label>
                                <input type="number" value={productConfig.gelCarbs} onChange={e => handleConfigChange('gelCarbs', e.target.value)} className="w-full bg-cdsurface border-cdborder rounded text-xs text-cdtext px-2 py-1" />
                            </div>
                            <div>
                                <label className="text-[10px] text-cdmuted">Bar (g)</label>
                                <input type="number" value={productConfig.barCarbs} onChange={e => handleConfigChange('barCarbs', e.target.value)} className="w-full bg-cdsurface border-cdborder rounded text-xs text-cdtext px-2 py-1" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <label className="text-[10px] text-cdmuted">Bidon Size</label>
                            <select value={bidonSize} onChange={e => setBidonSize(parseInt(e.target.value))} className="w-full bg-cdsurface border-cdborder rounded text-xs text-cdtext px-2 py-1 mt-1">
                                <option value={500}>500ml</option>
                                <option value={750}>750ml</option>
                                <option value={1000}>1 Liter</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- RESULTS PANEL --- */}
                <div className="space-y-6 lg:col-span-2 flex flex-col h-full">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-cdborder/50 p-4 rounded-lg border border-cdborder text-center">
                            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">{calculateStrategy.carbsPerHour}g</div>
                            <div className="text-xs text-cdmuted uppercase">Carbs / Hour</div>
                        </div>
                        <div className="bg-cdborder/50 p-4 rounded-lg border border-cdborder text-center">
                            <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">{calculateStrategy.fluidPerHour}ml</div>
                            <div className="text-xs text-cdmuted uppercase">Fluid / Hour</div>
                        </div>
                        <div className="bg-cdborder/50 p-4 rounded-lg border border-cdborder text-center">
                            <Battery className="w-5 h-5 text-green-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">{calculateStrategy.totalCarbs}g</div>
                            <div className="text-xs text-cdmuted uppercase">Total Carbs</div>
                        </div>
                        <div className="bg-cdborder/50 p-4 rounded-lg border border-cdborder text-center">
                            <CloudRain className={`w-5 h-5 mx-auto mb-2 ${calculateStrategy.fluidPerHour > 800 ? 'text-red-500 animate-pulse' : 'text-blue-300'}`} />
                            <div className="text-2xl font-bold text-cdtext">{(calculateStrategy.totalFluid / 1000).toFixed(1)}L</div>
                            <div className="text-xs text-cdmuted uppercase">Total Fluid</div>
                        </div>
                    </div>

                    {/* Packing List */}
                    <div className="bg-cdbg border border-cdborder rounded-lg p-6">
                        <h3 className="text-cdtext font-bold mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-green-400" /> Race Day Packing List</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-3 bg-cdsurface px-4 py-3 rounded border border-cdborder flex-1 min-w-[150px]">
                                <div className="bg-blue-500/20 p-2 rounded text-blue-400 font-bold text-xl">{calculateStrategy.packing.bidons}</div>
                                <div>
                                    <div className="text-sm font-bold text-cdtext">Bidons</div>
                                    <div className="text-[10px] text-cdmuted">{bidonSize}ml + {calculateStrategy.packing.mixName}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-cdsurface px-4 py-3 rounded border border-cdborder flex-1 min-w-[150px]">
                                <div className="bg-yellow-500/20 p-2 rounded text-yellow-400 font-bold text-xl">{calculateStrategy.packing.gels}</div>
                                <div>
                                    <div className="text-sm font-bold text-cdtext">Gels</div>
                                    <div className="text-[10px] text-cdmuted">{calculateStrategy.packing.gelName}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-cdsurface px-4 py-3 rounded border border-cdborder flex-1 min-w-[150px]">
                                <div className="bg-green-500/20 p-2 rounded text-green-400 font-bold text-xl">{calculateStrategy.packing.bars}</div>
                                <div>
                                    <div className="text-sm font-bold text-cdtext">Solid Bars</div>
                                    <div className="text-[10px] text-cdmuted">{calculateStrategy.packing.barName}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 bg-cdbg border border-cdborder rounded-lg p-6 overflow-hidden flex flex-col">
                        <h3 className="text-cdtext font-bold mb-4 flex items-center gap-2"><Clock size={16} /> Nutrition Timeline</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {/* Pre-Load */}
                            <div className="flex items-center gap-4 text-cdmuted border-l-2 border-cdborder pl-4 py-1">
                                <span className="font-mono text-xs w-12">-15m</span>
                                <div className="bg-cdsurface px-3 py-1 rounded text-xs">Drink 300ml + 1 Gel (Pre-load)</div>
                            </div>

                            {timeline.map((event, idx) => (
                                <div key={idx} className="flex items-center gap-4 text-cdtext border-l-2 border-yellow-500/50 pl-4 py-1">
                                    <span className="font-mono text-sm w-12 text-yellow-400">{Math.floor(event.time / 60)}h{event.time % 60 > 0 ? event.time % 60 : '00'}</span>
                                    <div className="flex items-center gap-2 bg-cdsurface px-3 py-2 rounded text-sm w-full">
                                        <event.icon size={14} className="text-cdmuted" />
                                        {event.action}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FuelingStrategy;
