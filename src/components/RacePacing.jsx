import React, { useState, useMemo } from 'react';
import { Mountain, Plus, Trash2, AlertTriangle, TrendingDown, Battery, Zap, Clock, Utensils, Info, Lightbulb} from 'lucide-react';
import ClimbSelector from './shared/ClimbSelector';
import FlagIcon from './FlagIcon';

const RacePacing = ({ userSettings, initialState, onStateChange, onExportToFueling }) => {
    const [selectedClimbs, setSelectedClimbs] = useState(initialState?.selectedClimbs || []);
    const [recoveryMinutes, setRecoveryMinutes] = useState(initialState?.recoveryMinutes || {});
    const [targetIntensity, setTargetIntensity] = useState(initialState?.targetIntensity || 0.85);

    // Sync state changes to parent
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({ selectedClimbs, recoveryMinutes, targetIntensity });
        }
    }, [selectedClimbs, recoveryMinutes, targetIntensity, onStateChange]);

    // Physics constants
    const CRR = 0.004; // Rolling resistance
    const CDA = 0.32; // Drag coefficient (mÂ²)
    const AIR_DENSITY = 1.225; // kg/mÂ³
    const DRIVETRAIN_LOSS = 0.975; // 2.5% loss
    const GRAVITY = 9.81;

    // Calculate time for a single climb
    const calculateClimbTime = (climb, power) => {
        const totalMass = (userSettings.weight + userSettings.bikeWeight);
        const distanceM = climb.lengthKm * 1000;
        const gradeRad = Math.atan(climb.avgGrade / 100);

        // Power balance equation
        const gravityForce = totalMass * GRAVITY * Math.sin(gradeRad);
        const rollingForce = totalMass * GRAVITY * CRR * Math.cos(gradeRad);

        // Estimate average speed iteratively
        let v = 5; // Start estimate (m/s)
        for (let i = 0; i < 10; i++) {
            const airResistance = 0.5 * CDA * AIR_DENSITY * v * v;
            const totalForce = gravityForce + rollingForce + airResistance;
            const powerNeeded = totalForce * v / DRIVETRAIN_LOSS;

            if (Math.abs(powerNeeded - power) < 1) break;
            v = v * (power / powerNeeded) ** 0.3; // Adjust speed
        }

        const timeSeconds = distanceM / v;
        return timeSeconds / 60; // Return in minutes
    };

    // Add climb to race plan
    const addClimb = (climb) => {
        if (climb && !selectedClimbs.find(c => c.id === climb.id)) {
            setSelectedClimbs([...selectedClimbs, climb]);
            setRecoveryMinutes({ ...recoveryMinutes, [climb.id]: 30 });
        }
    };

    // Remove climb
    const removeClimb = (climbId) => {
        setSelectedClimbs(selectedClimbs.filter(c => c.id !== climbId));
        const newRecovery = { ...recoveryMinutes };
        delete newRecovery[climbId];
        setRecoveryMinutes(newRecovery);
    };

    // Calculate full race strategy
    const raceStrategy = useMemo(() => {
        if (selectedClimbs.length === 0) return null;

        const basePower = userSettings.ftp * targetIntensity;

        // Calculate metrics for each climb
        const climbDetails = selectedClimbs.reduce((acc, climb) => {
            const prevDetail = acc[acc.length - 1];
            const prevCumulativeTime = prevDetail ? prevDetail.cumulativeTime : 0;
            const prevCumulativeEnergy = prevDetail ? prevDetail.cumulativeEnergy : 0;

            const time = calculateClimbTime(climb, basePower);
            const energy = (basePower * time * 60) / 1000; // kJ mechanical energy
            // Convert to metabolic energy (body is ~23% efficient)
            // Then to carbs: 1 kJ = 0.239 kcal, 1g carbs = 4 kcal
            // At high intensity, ~60% energy from carbs
            const carbs = energy / 0.23 * 0.239 / 4 * 0.6; // grams

            // Add recovery time
            const recovery = recoveryMinutes[climb.id] || 0;
            const cumulativeTime = prevCumulativeTime + time + recovery;
            const cumulativeEnergy = prevCumulativeEnergy + energy;

            acc.push({
                climb,
                power: basePower,
                timeMinutes: time,
                energyKj: energy,
                carbsGrams: carbs,
                cumulativeTime,
                cumulativeEnergy,
                recovery,
                wPerKg: basePower / userSettings.weight
            });

            return acc;
        }, []);

        // Total race stats
        const totalClimbTime = climbDetails.reduce((sum, c) => sum + c.timeMinutes, 0);
        const lastDetail = climbDetails[climbDetails.length - 1];
        const totalTime = lastDetail ? lastDetail.cumulativeTime : 0;
        const totalEnergy = lastDetail ? lastDetail.cumulativeEnergy : 0;
        const totalCarbs = climbDetails.reduce((sum, c) => sum + c.carbsGrams, 0);

        // Glycogen depletion estimate
        // Trained athlete: ~500g glycogen = 2000 kcal = 500g × 4 kcal/g
        const maxGlycogenKcal = 2000; // kcal
        const metabolicEnergyKcal = totalEnergy / 0.23 * 0.239; // Convert mechanical kJ to metabolic kcal
        const glycogenUsedKcal = metabolicEnergyKcal * 0.6; // 60% from glycogen at race intensity
        const glycogenPercent = (glycogenUsedKcal / maxGlycogenKcal) * 100;

        // Warning flags
        const warnings = [];
        if (glycogenPercent > 90) {
            warnings.push("KRITIEK: Glycogeen depot bijna leeg! Verhoog carb intake.");
        } else if (glycogenPercent > 70) {
            warnings.push("WAARSCHUWING: Hoge glycogeen depletie. Zorg voor voldoende voeding.");
        }

        if (totalTime > 300) {
            warnings.push("Race duurt >5 uur. Overweeg pacing te verlagen naar 0.75-0.80 IF.");
        }

        // Calculate required carbs per hour
        const carbsPerHour = (totalCarbs / (totalTime / 60));
        if (carbsPerHour > 100) {
            warnings.push("Te hoog carb verbruik! Dit is niet realistisch vol te houden.");
        }

        return {
            climbDetails,
            totalClimbTime,
            totalTime,
            totalEnergy,
            totalCarbs,
            glycogenPercent,
            carbsPerHour,
            avgPower: basePower,
            avgWPerKg: basePower / userSettings.weight,
            warnings
        };
    }, [selectedClimbs, recoveryMinutes, targetIntensity, userSettings]);

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Mountain className="text-yellow-400" />
                    Multi-Climb Race Pacing Strategy
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    Physics-Based Pacing
                </div>
            </div>

            {/* Methodology Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">ℹ️ Hoe werkt dit?</h4>
                <div className="text-xs text-cdtext space-y-1">
                    <p><strong>• Climb tijden:</strong> Berekend via physics engine (zwaartekracht, luchtweerstand, rolweerstand)</p>
                    <p><strong>• Energie verbruik:</strong> Mechanisch vermogen (kJ) → Metabolisch verbruik (lichaam is ~23% efficient)</p>
                    <p><strong>• Koolhydraten:</strong> Bij race intensiteit komt ~60% energie uit glycogeen. 1g carbs = 4 kcal</p>
                    <p><strong>• Glycogeen depot:</strong> Getrainde atleet heeft ~500g glycogeen (~2000 kcal) beschikbaar</p>
                    <p><strong>💡 Tip:</strong> Vermijd depletie &gt;80% - je hebt ook nog energie nodig voor vlakke stukken!</p>
                </div>
            </div>

            {/* Configuration Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Climb Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Voeg Beklimmingen Toe</h3>

                    {/* Climb Selector */}
                    <ClimbSelector
                        mode="multi"
                        onSelect={addClimb}
                        excludeIds={selectedClimbs.map(c => c.id)}
                        showNearbyFilter={true}
                    />

                    {/* Target Intensity Slider */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder">
                        <div className="flex justify-between text-xs text-cdtext mb-2">
                            <span>Race Intensity (IF)</span>
                            <span className="font-mono text-yellow-400">{(targetIntensity * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.60"
                            max="1.00"
                            step="0.01"
                            value={targetIntensity}
                            onChange={e => setTargetIntensity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
                        <div className="text-xs text-cdmuted mt-1">
                            {targetIntensity < 0.75 && "Endurance pace - goed voor ultralange races"}
                            {targetIntensity >= 0.75 && targetIntensity < 0.85 && "Tempo pace - houdbaar voor 3-5 uur"}
                            {targetIntensity >= 0.85 && targetIntensity < 0.95 && "Race pace - houdbaar voor 1-3 uur"}
                            {targetIntensity >= 0.95 && "Threshold+ - alleen voor korte races!"}
                        </div>
                    </div>
                </div>

                {/* Right: Selected Climbs List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">
                        Race Plan ({selectedClimbs.length} climbs)
                    </h3>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {selectedClimbs.length === 0 ? (
                            <div className="text-center py-8 text-cdmuted text-sm">
                                Nog geen beklimmingen toegevoegd
                            </div>
                        ) : (
                            selectedClimbs.map((climb, idx) => (
                                <div key={climb.id} className="bg-cdbg border border-cdborder rounded p-3 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-cdtext font-bold text-sm">
                                                {idx + 1}. <FlagIcon country={climb.country} size="sm" /> {climb.name}
                                            </div>
                                            <div className="text-xs text-cdmuted">
                                                {climb.lengthKm}km • {climb.elevation}m • {climb.avgGrade}%
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeClimb(climb.id)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Recovery Time Input */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-cdmuted">Recovery na climb:</span>
                                        <input
                                            type="number"
                                            value={recoveryMinutes[climb.id] || 0}
                                            onChange={(e) => setRecoveryMinutes({
                                                ...recoveryMinutes,
                                                [climb.id]: parseInt(e.target.value) || 0
                                            })}
                                            className="w-16 bg-cdsurface border border-cdborder rounded px-2 py-1 text-cdtext"
                                        />
                                        <span className="text-cdmuted">minuten</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            {raceStrategy && (
                <div className="space-y-6 bg-cdbg p-6 rounded-lg border border-cdborder">
                    {/* Warnings */}
                    {raceStrategy.warnings.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                <div className="space-y-1">
                                    {raceStrategy.warnings.map((warning, idx) => (
                                        <div key={idx} className="text-sm text-red-700">{warning}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-cdsurface p-4 rounded border border-cdborder text-center">
                            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">
                                {Math.floor(raceStrategy.totalTime / 60)}h{Math.round(raceStrategy.totalTime % 60)}m
                            </div>
                            <div className="text-xs text-cdmuted uppercase">Total Time</div>
                        </div>

                        <div className="bg-cdsurface p-4 rounded border border-cdborder text-center">
                            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">{Math.round(raceStrategy.avgPower)}W</div>
                            <div className="text-xs text-cdmuted uppercase">
                                {raceStrategy.avgWPerKg.toFixed(1)} W/kg
                            </div>
                        </div>

                        <div className="bg-cdsurface p-4 rounded border border-cdborder text-center">
                            <Battery className={`w-5 h-5 mx-auto mb-2 ${raceStrategy.glycogenPercent > 70 ? 'text-red-500' : 'text-green-500'}`} />
                            <div className="text-2xl font-bold text-cdtext">
                                {Math.round(raceStrategy.glycogenPercent)}%
                            </div>
                            <div className="text-xs text-cdmuted uppercase">Glycogen Used</div>
                        </div>

                        <div className="bg-cdsurface p-4 rounded border border-cdborder text-center">
                            <TrendingDown className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-cdtext">
                                {Math.round(raceStrategy.carbsPerHour)}g/h
                            </div>
                            <div className="text-xs text-cdmuted uppercase">Carbs Needed</div>
                        </div>
                    </div>

                    {/* Climb-by-Climb Breakdown */}
                    <div>
                        <h3 className="text-cdtext font-bold mb-3 text-sm uppercase tracking-wide">
                            Climb-by-Climb Analysis
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-cdborder text-cdmuted text-xs">
                                        <th className="text-left py-2 px-2">#</th>
                                        <th className="text-left py-2 px-2">Climb</th>
                                        <th className="text-right py-2 px-2">Power</th>
                                        <th className="text-right py-2 px-2">Time</th>
                                        <th className="text-right py-2 px-2">Carbs</th>
                                        <th className="text-right py-2 px-2">Cumulative</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {raceStrategy.climbDetails.map((detail, idx) => (
                                        <tr key={detail.climb.id} className="border-b border-cdborder hover:bg-cdsurface/80">
                                            <td className="py-2 px-2 text-cdmuted">{idx + 1}</td>
                                            <td className="py-2 px-2 text-cdtext font-medium">
                                                {detail.climb.name}
                                            </td>
                                            <td className="py-2 px-2 text-right text-yellow-600 font-mono">
                                                {Math.round(detail.power)}W
                                            </td>
                                            <td className="py-2 px-2 text-right text-cdtext font-mono">
                                                {Math.round(detail.timeMinutes)}m
                                            </td>
                                            <td className="py-2 px-2 text-right text-orange-500 font-mono">
                                                {Math.round(detail.carbsGrams)}g
                                            </td>
                                            <td className="py-2 px-2 text-right text-cdmuted font-mono text-xs">
                                                {Math.floor(detail.cumulativeTime / 60)}h{Math.round(detail.cumulativeTime % 60)}m
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Nutrition Recommendation */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="text-green-700 font-bold text-sm mb-2">💡 Voedingsstrategie</h4>
                                <p className="text-sm text-cdtext">
                                    Voor deze race heb je <strong>{Math.round(raceStrategy.totalCarbs)}g koolhydraten</strong> nodig
                                    ({Math.round(raceStrategy.carbsPerHour)}g/uur).
                                    {raceStrategy.carbsPerHour <= 60 && " Dit is goed haalbaar met standaard sportvoeding."}
                                    {raceStrategy.carbsPerHour > 60 && raceStrategy.carbsPerHour <= 90 &&
                                        " Train je spijsvertering met deze hoge carb intake!"}
                                    {raceStrategy.carbsPerHour > 90 &&
                                        " Dit is extreem hoog - overweeg pacing te verlagen of extra herstel tussen climbs."}
                                </p>
                            </div>
                            {onExportToFueling && (
                                <button
                                    onClick={() => onExportToFueling(raceStrategy.totalTime, targetIntensity)}
                                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-cdtext px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap w-full sm:w-auto justify-center"
                                >
                                    <Utensils size={16} />
                                    Open in Fueling →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RacePacing;
