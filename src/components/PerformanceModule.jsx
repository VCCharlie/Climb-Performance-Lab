import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { Activity, TrendingUp, Zap, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDateDDMMYYYY } from '/src/utils';

const StatCard = ({ title, value, unit, subtitle, icon: Icon, trend, colorClass }) => (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
            <Icon size={64} />
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg bg-slate-700/50 ${colorClass} text-white`}>
                    <Icon size={18} />
                </div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">{title}</h3>
            </div>

            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{value}</span>
                {unit && <span className="text-sm font-bold text-slate-400">{unit}</span>}
            </div>

            {subtitle && (
                <div className="mt-2 flex items-center gap-2 text-xs font-medium">
                    {trend === 'up' && <ArrowUp size={12} className="text-green-400" />}
                    {trend === 'down' && <ArrowDown size={12} className="text-red-400" />}
                    <span className="text-slate-400">{subtitle}</span>
                </div>
            )}
        </div>
    </div>
);

const PeriodStatistics = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Aggregates
    const totalRides = data.length;
    const totalDistance = Math.round(data.reduce((acc, d) => acc + (d.distance || 0), 0) / 1000); // km
    const totalElevation = Math.round(data.reduce((acc, d) => acc + (d.climbing || 0), 0)); // m
    const totalTimeHours = Math.round(data.reduce((acc, d) => acc + (d.moving_time || 0), 0) / 3600);
    const totalEnergy = Math.round(data.reduce((acc, d) => acc + (d.work || 0), 0)); // kJ

    // Averages
    const avgPower = Math.round(data.reduce((acc, d) => acc + (d.avg_power || 0), 0) / totalRides);
    const avgHr = Math.round(data.reduce((acc, d) => acc + (d.avg_hr || 0), 0) / totalRides);
    const maxPower = Math.max(...data.map(d => d.max_power || 0));
    const maxHr = Math.max(...data.map(d => d.max_hr || 0));

    // Indoor vs Outdoor (assuming 'VirtualRide' is indoor)
    const indoorRides = data.filter(d => d.type === 'VirtualRide');
    const outdoorRides = data.filter(d => d.type !== 'VirtualRide');

    const indoorDist = Math.round(indoorRides.reduce((acc, d) => acc + (d.distance || 0), 0) / 1000);
    const outdoorDist = totalDistance - indoorDist;

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl mt-6">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                <Calendar className="text-yellow-400" size={20} />
                <h3 className="text-lg font-bold text-white">Period Statistics</h3>
                <span className="text-xs text-slate-400 ml-auto font-mono">
                    {new Date(data[0].date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(data[data.length - 1].date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {/* COLUMN 1: VOLUME */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Volume</h4>
                    <div>
                        <div className="text-2xl font-black text-white">{totalDistance} <span className="text-xs text-slate-500 font-normal">km</span></div>
                        <div className="text-xs text-slate-400">Total Distance</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white">{totalElevation} <span className="text-xs text-slate-500 font-normal">m</span></div>
                        <div className="text-xs text-slate-400">Elevation Gain</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-slate-300">{totalTimeHours} <span className="text-xs text-slate-500 font-normal">hrs</span></div>
                        <div className="text-xs text-slate-400">Moving Time</div>
                    </div>
                </div>

                {/* COLUMN 2: INTENSITY */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Intensity (Avg)</h4>
                    <div>
                        <div className="text-2xl font-black text-green-400">{avgPower} <span className="text-xs text-slate-500 font-normal">W</span></div>
                        <div className="text-xs text-slate-400">Avg Power</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-red-400">{avgHr} <span className="text-xs text-slate-500 font-normal">bpm</span></div>
                        <div className="text-xs text-slate-400">Avg Heart Rate</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-yellow-400">{totalEnergy} <span className="text-xs text-slate-500 font-normal">kJ</span></div>
                        <div className="text-xs text-slate-400">Total Work</div>
                    </div>
                </div>

                {/* COLUMN 3: MAXIMA */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Period Maxima</h4>
                    <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400">Max Power</span>
                            <span className="text-xl font-bold text-white">{maxPower} W</span>
                        </div>
                    </div>
                    <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400">Max HR</span>
                            <span className="text-xl font-bold text-white">{maxHr} bpm</span>
                        </div>
                    </div>
                </div>

                {/* COLUMN 4: CONTEXT */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Environment</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Outdoor</span>
                            <span className="font-bold text-white">{outdoorDist} km <span className="text-slate-500 text-xs">({outdoorRides.length})</span></span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${(outdoorDist / totalDistance) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-sm mt-3">
                            <span className="text-slate-400">Indoor (Virtual)</span>
                            <span className="font-bold text-white">{indoorDist} km <span className="text-slate-500 text-xs">({indoorRides.length})</span></span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `${(indoorDist / totalDistance) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- HIER IS DE WIJZIGING (prop: customTicks) ---
const PerformanceModule = ({ data, manualFtp, customTicks }) => {
    // Use filtered data passed from parent
    const filteredData = data || [];

    // --- SMART TICKS CONVERSION ---
    // Omdat je XAxis type="number" gebruikt met timestamps (dateNum),
    // moeten we de customTicks (datums strings) omzetten naar timestamps.
    const axisTicks = customTicks ? customTicks.map(t => new Date(t).getTime()) : undefined;

    // --- 1. Stat Calculation ---
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;

    // Display Manual FTP if set, otherwise from latest activity
    const displayFtp = manualFtp || latest?.ftp || 0;

    // Find max eFTP in the filtered dataset
    const maxEftp = filteredData.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);
    const hasSeaLevelPower = filteredData.some(d => d.seaLevelPower);

    // Find latest valid eFTP
    const lastValidEftp = [...filteredData].reverse().find(d => d.eFTP > 0)?.eFTP || 0;

    const currentLoad = latest?.load || 0;
    const totalActivities = filteredData.length;
    const showDots = totalActivities < 60; // Hide dots if too many points

    return (
        <>
            {/* STAT BOXES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Current FTP"
                    value={displayFtp}
                    unit="W"
                    subtitle="Manually set threshold"
                    icon={Zap}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="Est. FTP (eFTP)"
                    value={lastValidEftp}
                    unit="W"
                    subtitle={`Period Max: ${maxEftp} W`}
                    icon={TrendingUp}
                    trend={lastValidEftp >= displayFtp ? 'up' : 'down'}
                    colorClass="text-green-500"
                />
                <StatCard
                    title="Fitness Load"
                    value={currentLoad}
                    unit="TSS/d"
                    subtitle="42-day rolling average"
                    icon={Activity}
                    colorClass="text-purple-500"
                />
                <StatCard
                    title="Total Rides"
                    value={totalActivities}
                    unit=""
                    subtitle="In selected period"
                    icon={Calendar}
                    colorClass="text-yellow-500"
                />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 gap-6">

                {/* MAIN PERFORMANCE CHART */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="text-blue-400" size={20} />
                            FTP Progression & Load
                        </h3>
                    </div>

                    <div className="min-h-[300px] h-[50vh] max-h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={filteredData.map(d => ({ ...d, dateNum: new Date(d.date).getTime() }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="dateNum"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    stroke="#94a3b8"
                                    // DEZE 2 REGELS ZORGEN VOOR DE SCHONE AS:
                                    ticks={axisTicks} 
                                    interval={0} 
                                    tickFormatter={(timestamp) => {
                                        const d = new Date(timestamp);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    scale="time"
                                    minTickGap={50}
                                />
                                <YAxis yAxisId="left" stroke="#94a3b8" domain={['auto', 'auto']} />
                                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" domain={[0, 'auto']} hide />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="load"
                                    name="Fitness Load"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorLoad)"
                                />

                                <Line
                                    yAxisId="left"
                                    type="stepAfter"
                                    dataKey="ftp"
                                    name="Set FTP"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls
                                />

                                <Line
                                    yAxisId="left"
                                    connectNulls
                                    type="monotone"
                                    dataKey="eFTP"
                                    name="eFTP (Effort)"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={showDots ? { r: 3, fill: '#22c55e' } : false}
                                    activeDot={{ r: 6 }}
                                />

                                {hasSeaLevelPower && (
                                    <Line
                                        yAxisId="left"
                                        connectNulls
                                        type="monotone"
                                        dataKey="seaLevelPower"
                                        name="Sea Level Power"
                                        stroke="#f97316"
                                        strokeWidth={1}
                                        strokeDasharray="5 5"
                                        dot={showDots ? { r: 2, fill: '#f97316' } : false}
                                        activeDot={{ r: 5 }}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PERIOD STATISTICS TABLE (NEW) */}
                <PeriodStatistics data={filteredData} />

            </div>
        </>
    );
};

export default PerformanceModule;
