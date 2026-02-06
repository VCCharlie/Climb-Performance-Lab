import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { Activity, TrendingUp, Zap, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

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
                {unit && <span className="text-sm font-bold text-slate-500">{unit}</span>}
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

const PerformanceModule = ({ data, manualFtp }) => {
    // Use filtered data passed from parent
    const filteredData = data || [];

    // --- 1. Stat Calculation ---
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;

    // Display Manual FTP if set, otherwise from latest activity
    const displayFtp = manualFtp || latest?.ftp || 0;

    // Find max eFTP in the filtered dataset
    const maxEftp = filteredData.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);

    // Find latest valid eFTP
    const lastValidEftp = [...filteredData].reverse().find(d => d.eFTP > 0)?.eFTP || 0;

    const currentLoad = latest?.load || 0;
    const totalActivities = filteredData.length;

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
                            <ComposedChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tickFormatter={(str) => {
                                        const d = new Date(str);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    minTickGap={30}
                                />
                                <YAxis yAxisId="left" stroke="#94a3b8" domain={['auto', 'auto']} />
                                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" domain={[0, 'auto']} hide />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Legend iconType="circle" />

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
                                />

                                <Line
                                    yAxisId="left"
                                    connectNulls
                                    type="monotone"
                                    dataKey="eFTP"
                                    name="eFTP (Effort)"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#22c55e' }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PerformanceModule;
