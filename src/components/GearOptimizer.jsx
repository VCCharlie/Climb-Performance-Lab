import React, { useState, useMemo } from 'react';
import { Settings, TrendingUp, AlertCircle, CheckCircle, Bike } from 'lucide-react';
import { getDefaultClimb } from '../services/climbDatabase';
import ClimbSelector from './shared/ClimbSelector';

const GearOptimizer = ({ userSettings, initialState, onStateChange }) => {
    // Gearing configuration
    const [chainrings, setChainrings] = useState(initialState?.chainrings || [50, 34]);
    const [cassette, setCassette] = useState(initialState?.cassette || [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28]);
    const [wheelDiameter, setWheelDiameter] = useState(initialState?.wheelDiameter || 700);
    const [tyreMm, setTyreMm] = useState(initialState?.tyreMm || 25);

    // Climb selection
    const [selectedClimb, setSelectedClimb] = useState(initialState?.selectedClimb || getDefaultClimb());
    const [targetPower, setTargetPower] = useState(userSettings.ftp * 0.85);
    const [targetCadence, setTargetCadence] = useState(initialState?.targetCadence || 80);

    // Sync state changes to parent
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({ chainrings, cassette, wheelDiameter, tyreMm, selectedClimb, targetCadence });
        }
    }, [chainrings, cassette, wheelDiameter, tyreMm, selectedClimb, targetCadence, onStateChange]);

    // Common gearing presets
    const gearingPresets = {
        compact: { name: 'Compact (50/34)', chainrings: [50, 34] },
        standard: { name: 'Standard (53/39)', chainrings: [53, 39] },
        semi_compact: { name: 'Semi-Compact (52/36)', chainrings: [52, 36] },
        gravel: { name: 'Gravel (48/32)', chainrings: [48, 32] },
        mtb: { name: 'MTB 1x (32)', chainrings: [32] }
    };

    const cassettePresets = {
        race: { name: '11-28 (Race)', cogs: [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28] },
        endurance: { name: '11-32 (Endurance)', cogs: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32] },
        climbing: { name: '11-34 (Climbing)', cogs: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32, 34] },
        mountain: { name: '10-51 (MTB)', cogs: [10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 45, 51] }
    };

    // Calculate wheel circumference
    const wheelCircumference = useMemo(() => {
        const diameterMm = wheelDiameter === 700 ? 622 : 559; // 700c or 26"
        const totalDiameter = diameterMm + (2 * tyreMm);
        return (totalDiameter * Math.PI) / 1000; // meters
    }, [wheelDiameter, tyreMm]);



    // Calculate gear ratio and resulting cadence/speed
    const gearAnalysis = useMemo(() => {
        // Local calculateSpeed function
        const calculateSpeed = (power) => {
            const CRR = 0.004;
            const CDA = 0.32;
            const AIR_DENSITY = 1.225;
            const DRIVETRAIN_LOSS = 0.975;
            const GRAVITY = 9.81;

            const totalMass = userSettings.weight + userSettings.bikeWeight;
            const gradeRad = Math.atan(selectedClimb.avgGrade / 100);

            const gravityForce = totalMass * GRAVITY * Math.sin(gradeRad);
            const rollingForce = totalMass * GRAVITY * CRR * Math.cos(gradeRad);

            // Iteratively solve for speed
            let v = 5; // m/s initial guess
            for (let i = 0; i < 20; i++) {
                const airResistance = 0.5 * CDA * AIR_DENSITY * v * v;
                const totalForce = gravityForce + rollingForce + airResistance;
                const powerNeeded = totalForce * v / DRIVETRAIN_LOSS;

                if (Math.abs(powerNeeded - power) < 0.5) break;
                v = v * Math.pow(power / powerNeeded, 0.3);
            }

            return v * 3.6; // km/h
        };

        const speedKmh = calculateSpeed(targetPower);
        const speedMs = speedKmh / 3.6;

        const gears = [];
        chainrings.forEach(chainring => {
            cassette.forEach(cog => {
                const ratio = chainring / cog;
                const development = ratio * wheelCircumference; // meters per pedal revolution

                // Calculate cadence needed to achieve target speed
                const cadenceNeeded = (speedMs / wheelCircumference) * 60 / ratio;

                // Calculate speed at target cadence
                const speedAtTargetCadence = (targetCadence / 60) * ratio * wheelCircumference * 3.6;

                gears.push({
                    chainring,
                    cog,
                    ratio,
                    development,
                    cadenceNeeded,
                    speedAtTargetCadence,
                    isSuitable: cadenceNeeded >= 60 && cadenceNeeded <= 100
                });
            });
        });

        // Find optimal gear (closest to target cadence)
        const sorted = [...gears].sort((a, b) => {
            const diffA = Math.abs(a.cadenceNeeded - targetCadence);
            const diffB = Math.abs(b.cadenceNeeded - targetCadence);

            // If cadences are very similar (within 3 rpm), prefer the smaller chainring
            // to avoid cross-chaining (e.g., 50x34 is usually worse than 34x23)
            if (Math.abs(diffA - diffB) < 3.0) {
                return a.chainring - b.chainring;
            }
            return diffA - diffB;
        });

        const optimal = sorted[0];
        const easiest = gears[gears.length - 1]; // Smallest chainring, biggest cog

        return {
            gears,
            optimal,
            easiest,
            targetSpeedKmh: speedKmh
        };
    }, [chainrings, cassette, selectedClimb, targetPower, targetCadence, wheelCircumference, userSettings.weight, userSettings.bikeWeight]);

    // Recommendations
    const recommendations = useMemo(() => {
        const tips = [];

        // Check if easiest gear is too hard
        if (gearAnalysis.easiest.cadenceNeeded < 60) {
            tips.push({
                type: 'warning',
                message: `Your easiest gear (${gearAnalysis.easiest.chainring}x${gearAnalysis.easiest.cog}) needs a cadence of ${Math.round(gearAnalysis.easiest.cadenceNeeded)} rpm. That is too low (<60 rpm).`
            });
            tips.push({
                type: 'suggestion',
                message: `Consider a cassette with a larger cog (e.g. 32T or 34T instead of ${cassette[cassette.length - 1]}T).`
            });
        } else if (gearAnalysis.easiest.cadenceNeeded > 100) {
            tips.push({
                type: 'info',
                message: `Your gearing is very light. You have margin for a harder gear or higher power.`
            });
        } else {
            tips.push({
                type: 'success',
                message: `Your gearing suits this climb! You can hold cadence between 60–100 rpm.`
            });
        }

        // Gradient-based recommendations
        if (selectedClimb.avgGrade > 10 && cassette[cassette.length - 1] < 32) {
            tips.push({
                type: 'warning',
                message: `For gradients above 10%, a 32T+ cassette is strongly recommended.`
            });
        }

        return tips;
    }, [gearAnalysis, cassette, selectedClimb]);

    return (
        <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-cdtext flex items-center gap-2">
                    <Settings className="text-blue-400" />
                    Gear Ratio Optimizer
                </h2>
                <div className="text-xs text-cdmuted bg-cdbg px-3 py-1 rounded-full border border-cdborder">
                    Find Your Perfect Gearing
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Huidige Setup</h3>

                    {/* Chainrings Preset */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <label className="text-xs text-cdmuted uppercase">Kettingbladen</label>
                        <select
                            onChange={(e) => setChainrings(gearingPresets[e.target.value].chainrings)}
                            className="w-full bg-cdborder border border-cdborder rounded px-3 py-2 text-cdtext text-sm"
                        >
                            {Object.keys(gearingPresets).map(key => (
                                <option key={key} value={key}>{gearingPresets[key].name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-cdmuted">
                            Current: {chainrings.join(' / ')}T
                        </div>
                    </div>

                    {/* Cassette Preset */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <label className="text-xs text-cdmuted uppercase">Cassette</label>
                        <select
                            onChange={(e) => setCassette(cassettePresets[e.target.value].cogs)}
                            className="w-full bg-cdborder border border-cdborder rounded px-3 py-2 text-cdtext text-sm"
                        >
                            {Object.keys(cassettePresets).map(key => (
                                <option key={key} value={key}>{cassettePresets[key].name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-cdmuted">
                            Current: {cassette[0]}-{cassette[cassette.length - 1]}T ({cassette.length} speed)
                        </div>
                    </div>

                    {/* Wheels */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <label className="text-xs text-cdmuted uppercase">Wielmaat</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setWheelDiameter(700)}
                                className={`px-3 py-2 text-sm rounded ${wheelDiameter === 700 ? 'bg-blue-500 text-cdtext' : 'bg-cdborder text-cdtext'}`}
                            >
                                700c (Road)
                            </button>
                            <button
                                onClick={() => setWheelDiameter(26)}
                                className={`px-3 py-2 text-sm rounded ${wheelDiameter === 26 ? 'bg-blue-500 text-cdtext' : 'bg-cdborder text-cdtext'}`}
                            >
                                26" (MTB)
                            </button>
                        </div>

                        <div>
                            <label className="text-xs text-cdmuted">Bandenmaat (mm)</label>
                            <input
                                type="number"
                                value={tyreMm}
                                onChange={(e) => setTyreMm(parseInt(e.target.value) || 25)}
                                className="w-full bg-cdborder border border-cdborder rounded px-3 py-2 text-cdtext text-sm mt-1"
                            />
                        </div>
                    </div>

                    {/* Climb Selection */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <label className="text-xs text-cdmuted uppercase">Test Climb</label>
                        <ClimbSelector
                            mode="single"
                            selected={selectedClimb}
                            onSelect={(climb) => setSelectedClimb(climb)}
                        />
                    </div>

                    {/* Target Power & Cadence */}
                    <div className="bg-cdbg/50 p-4 rounded border border-cdborder space-y-3">
                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Target Power</span>
                                <span className="font-mono text-yellow-400">{Math.round(targetPower)}W</span>
                            </div>
                            <input
                                type="range"
                                min={userSettings.ftp * 0.5}
                                max={userSettings.ftp * 1.2}
                                step="5"
                                value={targetPower}
                                onChange={(e) => setTargetPower(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-cdtext mb-1">
                                <span>Preferred Cadence</span>
                                <span className="font-mono text-blue-400">{targetCadence} rpm</span>
                            </div>
                            <input
                                type="range"
                                min="60"
                                max="100"
                                step="5"
                                value={targetCadence}
                                onChange={(e) => setTargetCadence(parseInt(e.target.value))}
                                className="w-full h-2 bg-cdborder rounded-lg appearance-none cursor-pointer accent-blue-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-cdtext uppercase tracking-wide">Analysis</h3>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cdbg p-4 rounded border border-cdborder text-center">
                            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-cdtext">
                                {gearAnalysis.targetSpeedKmh.toFixed(1)} km/h
                            </div>
                            <div className="text-xs text-cdmuted uppercase">Estimated Speed</div>
                        </div>

                        <div className="bg-cdbg p-4 rounded border border-cdborder text-center">
                            <Bike className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-cdtext">
                                {gearAnalysis.optimal.chainring}/{gearAnalysis.optimal.cog}
                            </div>
                            <div className="text-xs text-cdmuted uppercase">Optimal Gear</div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2">
                        {recommendations.map((rec, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded border text-sm flex items-start gap-2 ${rec.type === 'success'
                                    ? 'bg-green-500/20 border-green-500/50 text-green-500'
                                    : rec.type === 'warning'
                                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                                        : rec.type === 'info'
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-500'
                                            : 'bg-red-500/20 border-red-500/50 text-red-500'
                                    }`}
                            >
                                {rec.type === 'success' && <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
                                {rec.type === 'warning' && <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
                                {rec.type === 'info' && <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
                                <span>{rec.message}</span>
                            </div>
                        ))}
                    </div>

                    {/* Gear Chart */}
                    <div className="bg-cdbg border border-cdborder rounded p-4">
                        <h4 className="text-cdtext font-bold text-sm mb-3">Alle Verzetten (Cadans @ {Math.round(gearAnalysis.targetSpeedKmh)} km/h)</h4>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                            {gearAnalysis.gears.map((gear, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-2 rounded text-xs ${gear.isSuitable
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-cdsurface border border-cdborder'
                                        } ${gear === gearAnalysis.optimal ? 'ring-2 ring-yellow-400' : ''}`}
                                >
                                    <span className="text-cdtext font-mono">
                                        {gear.chainring}x{gear.cog}
                                    </span>
                                    <span className={`font-mono ${gear.isSuitable ? 'text-green-400' : 'text-cdmuted'}`}>
                                        {Math.round(gear.cadenceNeeded)} rpm
                                    </span>
                                    <span className="text-cdmuted">
                                        {gear.development.toFixed(2)}m
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-cdmuted mt-2">
                            Groene verzetten: 60-100 rpm | Geel = optimaal voor {targetCadence} rpm<br />
                            Development (m) = afstand per trapomwenteling
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GearOptimizer;
