import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartTooltipShellClass, getChartTheme } from '../../utils/chartTheme';

const ProfilerTooltip = ({ active, payload, showPowerZones, powerRecommendations }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const powerData = powerRecommendations?.find((p) => Math.abs(p.distance - data.distance) < 0.1);
        return (
            <div className={chartTooltipShellClass}>
                <p className="text-cdtext text-sm font-semibold">{data.distance.toFixed(1)} km</p>
                <p className="text-cdtext text-xs">Elevation: {Math.round(data.elevation).toLocaleString('en-GB')} m</p>
                <p className="text-cdprimary text-xs font-semibold mt-1">Gradient: {data.gradient.toFixed(1)}%</p>
                {showPowerZones && powerData && (
                    <p className="text-cdblue text-xs mt-1">
                        Suggested power: {powerData.recommendedPower} W
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
}) => {
    const theme = getChartTheme();

    const gradientId = `profilerGrad-${selectedClimb?.id || 'x'}`;
    const elevId = `profilerElev-${selectedClimb?.id || 'x'}`;

    return (
        <div className="space-y-5">
            <p className="text-xs text-cdmuted leading-relaxed px-1">
                Geen GPS-segmentdata: de kromme is een <span className="text-cdtext font-medium">eenvoudig model</span> met
                maar een paar hellingspatronen (afhankelijk van de gemiddelde helling). Nuttig als <span className="text-cdtext font-medium">afstandsschaal</span> en om{' '}
                <span className="text-cdtext font-medium">vermogenstips in de tooltip</span> te illustreren — niet als
                exacte locatie van steile stukken.
            </p>
            <div className="bg-cdbg/60 p-4 rounded-xl border border-cdborder">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-cdtext font-bold text-sm tracking-wide">Hellingsprofiel (model)</h3>
                        <p className="text-[10px] text-cdmuted mt-0.5">Geschat · niet de echte klim</p>
                    </div>
                    <span className="text-[10px] text-cdmuted uppercase shrink-0">% t.o.v. afstand</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.6} />
                        <XAxis
                            dataKey="distance"
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}`}
                            label={{ value: 'km', position: 'insideBottom', offset: -4, fill: theme.axis, fontSize: 11 }}
                        />
                        <YAxis
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: 11 }}
                            domain={[0, 'auto']}
                            label={{ value: '%', angle: -90, position: 'insideLeft', fill: theme.axis, fontSize: 11 }}
                        />
                        <Tooltip
                            content={
                                <ProfilerTooltip
                                    showPowerZones={showPowerZones}
                                    powerRecommendations={powerRecommendations}
                                />
                            }
                            cursor={theme.cursor}
                        />
                        <ReferenceLine
                            x={selectedClimb.lengthKm / 2}
                            stroke={theme.brand}
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
                    <div>
                        <h3 className="text-cdtext font-bold text-sm tracking-wide">Hoogte (totaal uit database)</h3>
                        <p className="text-[10px] text-cdmuted mt-0.5">Lineair verdeeld over de lengte · geen echte bochten</p>
                    </div>
                    <span className="text-[10px] text-cdmuted uppercase shrink-0">kumulatief</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={profileData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={elevId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                                <stop offset="95%" stopColor="#1e40af" stopOpacity={0.25} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} opacity={0.6} />
                        <XAxis
                            dataKey="distance"
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: 11 }}
                            tickFormatter={(v) => `${v.toFixed(1)}`}
                            label={{ value: 'km', position: 'insideBottom', offset: -4, fill: theme.axis, fontSize: 11 }}
                        />
                        <YAxis
                            stroke={theme.axis}
                            tick={{ fill: theme.axis, fontSize: 11 }}
                            label={{ value: 'm', angle: -90, position: 'insideLeft', fill: theme.axis, fontSize: 11 }}
                        />
                        <Tooltip
                            content={
                                <ProfilerTooltip
                                    showPowerZones={showPowerZones}
                                    powerRecommendations={powerRecommendations}
                                />
                            }
                            cursor={theme.cursor}
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
