import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, showPowerZones, powerRecommendations }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const powerData = powerRecommendations?.find(p => Math.abs(p.distance - data.distance) < 0.1);
        return (
            <div className="bg-cdsurface border border-cdborder p-3 rounded-lg shadow-xl text-left">
                <p className="text-cdtext text-sm font-bold">{data.distance.toFixed(1)} km</p>
                <p className="text-cdtext text-xs">Hoogte: {Math.round(data.elevation).toLocaleString('nl-NL')} m</p>
                <p className="text-cdaccent text-xs font-semibold mt-1">Helling: {data.gradient.toFixed(1)}%</p>
                {showPowerZones && powerData && (
                    <p className="text-blue-400 text-xs mt-1">
                        Advies vermogen: {powerData.recommendedPower} W
                        {powerData.zone?.name && (
                            <span className="text-cdmuted"> · {powerData.zone.name}</span>
                        )}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const ProfilerCharts = ({
    profileData,
    powerRecommendations,
    showPowerZones,
    selectedClimb,
    isDark
}) => {
    const grid = isDark ? '#334155' : '#e2e8f0';
    const axis = isDark ? '#94a3b8' : '#64748b';

    const gradientId = `profilerGrad-${selectedClimb?.id || 'x'}`;
    const elevId = `profilerElev-${selectedClimb?.id || 'x'}`;

    return (
        <div className="space-y-5">
            <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-cdtext font-bold text-sm tracking-wide">Hellingsprofiel</h3>
                    <span className="text-[10px] text-cdmuted uppercase">% t.o.v. afstand</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={profileData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85} />
                                <stop offset="50%" stopColor="#f97316" stopOpacity={0.55} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.35} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
                        <XAxis
                            dataKey="distance"
                            stroke={axis}
                            tick={{ fill: axis, fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}`}
                            label={{ value: 'km', position: 'insideBottom', offset: -4, fill: axis, fontSize: 11 }}
                        />
                        <YAxis
                            stroke={axis}
                            tick={{ fill: axis, fontSize: 11 }}
                            domain={[0, 'auto']}
                            label={{ value: '%', angle: -90, position: 'insideLeft', fill: axis, fontSize: 11 }}
                        />
                        <Tooltip
                            content={
                                <CustomTooltip
                                    showPowerZones={showPowerZones}
                                    powerRecommendations={powerRecommendations}
                                />
                            }
                        />
                        <ReferenceLine
                            x={selectedClimb.lengthKm / 2}
                            stroke={isDark ? '#eab308' : '#ca8a04'}
                            strokeDasharray="4 4"
                            strokeOpacity={0.7}
                        />
                        <Area
                            type="monotone"
                            dataKey="gradient"
                            stroke="#f97316"
                            fill={`url(#${gradientId})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-cdtext font-bold text-sm tracking-wide">Hoogteprofiel</h3>
                    <span className="text-[10px] text-cdmuted uppercase">kumulatief</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={profileData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={elevId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                                <stop offset="95%" stopColor="#1e40af" stopOpacity={0.25} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.6} />
                        <XAxis
                            dataKey="distance"
                            stroke={axis}
                            tick={{ fill: axis, fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}`}
                            label={{ value: 'km', position: 'insideBottom', offset: -4, fill: axis, fontSize: 11 }}
                        />
                        <YAxis
                            stroke={axis}
                            tick={{ fill: axis, fontSize: 11 }}
                            label={{ value: 'm', angle: -90, position: 'insideLeft', fill: axis, fontSize: 11 }}
                        />
                        <Tooltip
                            content={
                                <CustomTooltip
                                    showPowerZones={showPowerZones}
                                    powerRecommendations={powerRecommendations}
                                />
                            }
                        />
                        <Area
                            type="monotone"
                            dataKey="elevation"
                            stroke="#60a5fa"
                            fill={`url(#${elevId})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProfilerCharts;
