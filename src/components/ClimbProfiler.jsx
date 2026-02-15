import React, { useState, useMemo } from 'react';
import { Mountain, TrendingUp, Flag, AlertTriangle, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CLIMB_DATABASE } from '../climbs';

// Custom tooltip component (moved outside to avoid recreation on render)
const CustomTooltip = ({ active, payload, showPowerZones, powerRecommendations }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const powerData = powerRecommendations?.find(p => Math.abs(p.distance - data.distance) < 0.1);
        return (
            <div className="bg-slate-800 border border-slate-600 p-3 rounded shadow-lg">
                <p className="text-white text-sm font-bold">{data.distance.toFixed(1)} km</p>
                <p className="text-slate-300 text-xs">Hoogte: {data.elevation.toFixed(0)}m</p>
                <p className="text-yellow-400 text-xs font-bold">Hellingspercentage: {data.gradient.toFixed(1)}%</p>
                {showPowerZones && powerData && (
                    <p className="text-blue-400 text-xs">
                        Power: {powerData.recommendedPower}W
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const ClimbProfiler = ({ userSettings }) => {
    const [selectedClimb, setSelectedClimb] = useState(CLIMB_DATABASE[0]);
    const [showPowerZones, setShowPowerZones] = useState(true);

    // Generate realistic gradient profile from climb data
    const profileData = useMemo(() => {
        // Since we don't have detailed gradient data, we'll generate a realistic profile
        // based on typical climb characteristics
        const points = 50; // Number of data points
        const totalDistance = selectedClimb.lengthKm;
        const totalElevation = selectedClimb.elevation;
        const avgGrade = selectedClimb.avgGrade;

        const data = [];
        let cumulativeElevation = 0;

        for (let i = 0; i <= points; i++) {
            const distanceKm = (i / points) * totalDistance;
            const progress = i / points;

            // Generate realistic gradient variation
            // Most climbs have variations: steeper at bottom/top, easier in middle
            let gradientModifier = 1.0;

            // Add some realistic variation patterns
            if (avgGrade > 8) {
                // Steep climbs: often easier start, brutal middle, very steep finish
                gradientModifier = 0.7 + Math.sin(progress * Math.PI) * 0.5 + Math.sin(progress * Math.PI * 3) * 0.2;
            } else if (avgGrade > 6) {
                // Moderate climbs: variable with some flat sections
                gradientModifier = 0.9 + Math.sin(progress * Math.PI * 4) * 0.3;
            } else {
                // Shallow climbs: more consistent
                gradientModifier = 1.0 + Math.sin(progress * Math.PI * 2) * 0.15;
            }

            const gradient = avgGrade * gradientModifier;
            const segmentElevation = (totalElevation / points);

            cumulativeElevation += segmentElevation;

            data.push({
                distance: distanceKm,
                elevation: cumulativeElevation,
                gradient: Math.max(0, Math.min(gradient, 25)), // Cap between 0-25%
                progress: progress * 100
            });
        }

        return data;
    }, [selectedClimb]);

    // Calculate tactical zones
    const tacticalZones = useMemo(() => {
        const zones = [];

        // Find steep sections (>10%)
        profileData.forEach((point, idx) => {
            if (point.gradient > 10 && idx > 0) {
                zones.push({
                    km: point.distance,
                    type: 'steep',
                    gradient: point.gradient,
                    label: `Steile sectie: ${point.gradient.toFixed(1)}%`
                });
            }
        });

        // Find recovery sections (<5%)
        profileData.forEach((point, idx) => {
            if (point.gradient < 5 && selectedClimb.avgGrade > 6 && idx > 0 && idx < profileData.length - 1) {
                if (idx % 10 === 0) { // Don't mark every single point
                    zones.push({
                        km: point.distance,
                        type: 'recovery',
                        gradient: point.gradient,
                        label: `Herstel sectie: ${point.gradient.toFixed(1)}%`
                    });
                }
            }
        });

        // Add milestones
        zones.push({
            km: 0,
            type: 'start',
            label: 'START'
        });

        zones.push({
            km: selectedClimb.lengthKm / 2,
            type: 'halfway',
            label: 'HALVERWEGE'
        });

        zones.push({
            km: selectedClimb.lengthKm,
            type: 'finish',
            label: 'TOP'
        });

        return zones;
    }, [profileData, selectedClimb]);

    // Calculate recommended power for different sections
    const powerRecommendations = useMemo(() => {
        const basePower = userSettings.ftp * 0.85;

        return profileData.map(point => {
            // Adjust power based on gradient
            let powerMultiplier = 1.0;

            if (point.gradient > 12) {
                powerMultiplier = 0.95; // Slightly lower on very steep
            } else if (point.gradient < 5) {
                powerMultiplier = 1.1; // Push on easier sections
            }

            return {
                ...point,
                recommendedPower: Math.round(basePower * powerMultiplier),
                zone: COGGAN_ZONES.find(z =>
                    basePower * powerMultiplier / userSettings.ftp >= z.min &&
                    basePower * powerMultiplier / userSettings.ftp < z.max
                )
            };
        });
    }, [profileData, userSettings.ftp]);

    // Statistics
    const climbStats = useMemo(() => {
        const maxGradient = Math.max(...profileData.map(p => p.gradient));
        const minGradient = Math.min(...profileData.map(p => p.gradient));
        const steepSections = profileData.filter(p => p.gradient > 10).length;
        const steepPercentage = (steepSections / profileData.length) * 100;

        return {
            maxGradient,
            minGradient,
            steepPercentage,
            difficultyScore: (selectedClimb.lengthKm * selectedClimb.avgGrade * (1 + steepPercentage / 100)).toFixed(0)
        };
    }, [profileData, selectedClimb]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Mountain className="text-green-400" />
                    Climb Profile Visualizer
                </h2>
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                    Tactical Analysis
                </div>
            </div>

            {/* Climb Selection */}
            <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                <label className="text-xs text-slate-400 uppercase block mb-2">Selecteer Beklimming</label>
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
                            {climb.flag} {climb.name} - {climb.lengthKm}km @ {climb.avgGrade}% ({climb.elevation}m)
                        </option>
                    ))}
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{climbStats.maxGradient.toFixed(1)}%</div>
                    <div className="text-xs text-slate-400 uppercase">Max Gradient</div>
                </div>

                <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <Mountain className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{selectedClimb.avgGrade}%</div>
                    <div className="text-xs text-slate-400 uppercase">Avg Gradient</div>
                </div>

                <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{climbStats.steepPercentage.toFixed(0)}%</div>
                    <div className="text-xs text-slate-400 uppercase">Steep Sections</div>
                </div>

                <div className="bg-slate-900 p-4 rounded border border-slate-700 text-center">
                    <Flag className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{climbStats.difficultyScore}</div>
                    <div className="text-xs text-slate-400 uppercase">Difficulty Score</div>
                </div>
            </div>

            {/* Toggle Power Zones */}
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showPowerZones}
                        onChange={() => setShowPowerZones(!showPowerZones)}
                        className="accent-yellow-400"
                    />
                    Toon aanbevolen vermogen zones
                </label>
            </div>

            {/* Gradient Profile Chart */}
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide">
                    Hellingspercentage Profiel
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={profileData}>
                        <defs>
                            <linearGradient id="gradientColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="50%" stopColor="#f97316" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="distance"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            label={{ value: 'Afstand (km)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            label={{ value: 'Hellingspercentage (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                        />
                        <Tooltip content={<CustomTooltip showPowerZones={showPowerZones} powerRecommendations={powerRecommendations} />} />

                        {/* Reference lines for milestones */}
                        <ReferenceLine x={selectedClimb.lengthKm / 2} stroke="#facc15" strokeDasharray="3 3" />

                        <Area
                            type="monotone"
                            dataKey="gradient"
                            stroke="#f97316"
                            fill="url(#gradientColor)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Elevation Profile Chart */}
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide">
                    Hoogteprofiel
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={profileData}>
                        <defs>
                            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="distance"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            label={{ value: 'Afstand (km)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            label={{ value: 'Hoogte (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                        />
                        <Tooltip content={<CustomTooltip showPowerZones={showPowerZones} powerRecommendations={powerRecommendations} />} />
                        <Area
                            type="monotone"
                            dataKey="elevation"
                            stroke="#3b82f6"
                            fill="url(#elevationGradient)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Tactical Zones */}
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wide">
                    Tactische Punten
                </h3>
                <div className="space-y-2">
                    {tacticalZones.sort((a, b) => a.km - b.km).map((zone, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-3 p-2 rounded text-sm ${zone.type === 'steep'
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                    : zone.type === 'recovery'
                                        ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                                }`}
                        >
                            <MapPin size={14} className="flex-shrink-0" />
                            <span className="font-mono text-xs w-12">{zone.km.toFixed(1)}km</span>
                            <span className="flex-1">{zone.label}</span>
                            {zone.type === 'steep' && <span className="text-xs opacity-70">💪 Vasthouden!</span>}
                            {zone.type === 'recovery' && <span className="text-xs opacity-70">😌 Herstellen</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Pacing Strategy */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
                <h4 className="text-blue-400 font-bold text-sm mb-2">💡 Pacing Strategie</h4>
                <div className="text-sm text-slate-300 space-y-1">
                    <p>
                        • <strong>Start:</strong> Begin rustig, bouw power op naar 85% FTP in eerste km
                    </p>
                    <p>
                        • <strong>Steile secties:</strong> Houd power constant, laat snelheid zakken - niet stuk rijden!
                    </p>
                    <p>
                        • <strong>Vlakkere secties:</strong> Push iets harder ({Math.round(userSettings.ftp * 0.92)}W) om tijd goed te maken
                    </p>
                    <p>
                        • <strong>Laatste km:</strong> Als je nog energie hebt, push naar threshold (
                        {Math.round(userSettings.ftp)}W)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClimbProfiler;
