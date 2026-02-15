import React, { useState, useMemo } from 'react';
import { Settings, TrendingUp, AlertCircle, CheckCircle, Bike } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';

const GearOptimizer = ({ userSettings }) => {
    // Gearing configuration
    const [chainrings, setChainrings] = useState([50, 34]); // Compact
    const [cassette, setCassette] = useState([11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28]); // 11-28
    const [wheelDiameter, setWheelDiameter] = useState(700); // 700c
    const [tyreMm, setTyreMm] = useState(25); // 25mm tyres

    // Climb selection
    const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE[0]);
    const [targetPower, setTargetPower] = useState(userSettings.ftp * 0.85);
    const [targetCadence, setTargetCadence] = useState(80);

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

    // Calculate speed at given power on the climb
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

    // Calculate gear ratio and resulting cadence/speed
    const gearAnalysis = useMemo(() => {
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
        const sorted = [...gears].sort((a, b) =>
            Math.abs(a.cadenceNeeded - targetCadence) - Math.abs(b.cadenceNeeded - targetCadence)
        );

        const optimal = sorted[0];
        const easiest = gears[gears.length - 1]; // Smallest chainring, biggest cog

        return {
            gears,
            optimal,
            easiest,
            targetSpeedKmh: speedKmh
        };
    }, [chainrings, cassette, selectedClimb, targetPower, targetCadence, wheelCircumference]);

    // Recommendations
    const recommendations = useMemo(() => {
        const tips = [];

        // Check if easiest gear is too hard
        if (gearAnalysis.easiest.cadenceNeeded < 60) {
            tips.push({
                type: 'warning',
                message: `Je lichtste versnelling (${gearAnalysis.easiest.chainring}x${gearAnalysis.easiest.cog}) vereist een cadans van ${Math.round(gearAnalysis.easiest.cadenceNeeded)} rpm. Dit is te laag (<60 rpm).`
            });
            tips.push({
                type: 'suggestion',
                message: `Overweeg een cassette met een groter verzet (bijv. 32T of 34T ipv ${cassette[cassette.length - 1]}T).`
            });
        } else if (gearAnalysis.easiest.cadenceNeeded > 100) {
            tips.push({
                type: 'info',
                message: `Je versnelling is erg licht. Je hebt marge voor een zwaarder verzet of hogere power.`
            });
        } else {
            tips.push({
                type: 'success',
                message: `Je versnelling is geschikt voor deze klim! Je kunt een cadans tussen 60-100 rpm houden.`
            });
        }

        // Gradient-based recommendations
        if (selectedClimb.avgGrade > 10 && cassette[cassette.length - 1] < 32) {
            tips.push({
                type: 'warning',
                message: `Voor hellingen boven 10% is een 32T+ cassette sterk aan te raden.`
            });
        }

        return tips;
    }, [gearAnalysis, cassette, selectedClimb]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="text-blue-400" />
                    Gear Ratio Optimizer
                </h2>
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Find Your Perfect Gearing
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Huidige Setup</h3>

                    {/* Chainrings Preset */}
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <label className="text-xs text-slate-400 uppercase">Kettingbladen</label>
                        <select
                            onChange={(e) => setChainrings(gearingPresets[e.target.value].chainrings)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        >
                            {Object.keys(gearingPresets).map(key => (
                                <option key={key} value={key}>{gearingPresets[key].name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-slate-500">
                            Current: {chainrings.join(' / ')}T
                        </div>
                    </div>

                    {/* Cassette Preset */}
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <label className="text-xs text-slate-400 uppercase">Cassette</label>
                        <select
                            onChange={(e) => setCassette(cassettePresets[e.target.value].cogs)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        >
                            {Object.keys(cassettePresets).map(key => (
                                <option key={key} value={key}>{cassettePresets[key].name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-slate-500">
                            Current: {cassette[0]}-{cassette[cassette.length - 1]}T ({cassette.length} speed)
                        </div>
                    </div>

                    {/* Wheels */}
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <label className="text-xs text-slate-400 uppercase">Wielmaat</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setWheelDiameter(700)}
                                className={`px-3 py-2 text-sm rounded ${wheelDiameter === 700 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                            >
                                700c (Road)
                            </button>
                            <button
                                onClick={() => setWheelDiameter(26)}
                                className={`px-3 py-2 text-sm rounded ${wheelDiameter === 26 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                            >
                                26" (MTB)
                            </button>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400">Bandenmaat (mm)</label>
                            <input
                                type="number"
                                value={tyreMm}
                                onChange={(e) => setTyreMm(parseInt(e.target.value) || 25)}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm mt-1"
                            />
                        </div>
                    </div>

                    {/* Climb Selection */}
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <label className="text-xs text-slate-400 uppercase">Test Climb</label>
                        <select
                            onChange={(e) => {
                                const climb = CLIMB_DATABASE.find(c => c.id === e.target.value);
                                if (climb) setSelectedClimb(climb);
                            }}
                            value={selectedClimb.id}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        >
                            {CLIMB_DATABASE.map(climb => (
                                <option key={climb.id} value={climb.id}>
                                    {climb.flag} {climb.name} ({climb.avgGrade}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Target Power & Cadence */}
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
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
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-slate-300 mb-1">
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
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Analysis</h3>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">
                                {gearAnalysis.targetSpeedKmh.toFixed(1)} km/h
                            </div>
                            <div className="text-xs text-slate-400 uppercase">Estimated Speed</div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                            <Bike className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-white">
                                {gearAnalysis.optimal.chainring}/{gearAnalysis.optimal.cog}
                            </div>
                            <div className="text-xs text-slate-400 uppercase">Optimal Gear</div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2">
                        {recommendations.map((rec, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded border text-sm flex items-start gap-2 ${rec.type === 'success'
                                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                        : rec.type === 'warning'
                                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                                            : rec.type === 'info'
                                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                                : 'bg-red-500/10 border-red-500/30 text-red-300'
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
                    <div className="bg-slate-900 border border-slate-700 rounded p-4">
                        <h4 className="text-white font-bold text-sm mb-3">Alle Verzetten (Cadans @ {Math.round(gearAnalysis.targetSpeedKmh)} km/h)</h4>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                            {gearAnalysis.gears.map((gear, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-2 rounded text-xs ${gear.isSuitable
                                            ? 'bg-green-500/10 border border-green-500/20'
                                            : 'bg-slate-800 border border-slate-700'
                                        } ${gear === gearAnalysis.optimal ? 'ring-2 ring-yellow-400' : ''}`}
                                >
                                    <span className="text-white font-mono">
                                        {gear.chainring}x{gear.cog}
                                    </span>
                                    <span className={`font-mono ${gear.isSuitable ? 'text-green-400' : 'text-slate-500'}`}>
                                        {Math.round(gear.cadenceNeeded)} rpm
                                    </span>
                                    <span className="text-slate-500">
                                        {gear.development.toFixed(2)}m
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-slate-500 mt-2">
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
