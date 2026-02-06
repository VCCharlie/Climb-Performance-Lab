import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { Activity, TrendingUp, Zap, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { fetchIntervalsData } from '../services/intervalsService';

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

const Dashboard = ({ theme, manualFtp }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('1Y');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Fetch wide range to support all filters locally
                const startDate = '2020-01-01';
                const endDate = '2026-12-31'; // Future proof

                const rawData = await fetchIntervalsData(startDate, endDate);

                // Process Data: Add eFTP if missing, using best_20min * 0.95
                // Also ensure FTP is backfilled if missing
                const processedData = rawData.map(d => ({
                    ...d,
                    eFTP: d.best_20min ? Math.round(d.best_20min * 0.95) : null,
                    ftp: d.ftp || manualFtp // Use activity FTP or fallback to manual
                }));

                setChartData(processedData);
                setError(null);
            } catch (err) {
                setError('Kon data niet ophalen van Intervals.icu');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [manualFtp]);

    // --- Filter Logic ---
    const getFilteredData = () => {
        if (!chartData.length) return [];
        if (timeRange === 'ALL') return chartData;

        const now = new Date();
        const cutoffDate = new Date();

        if (timeRange === '1M') cutoffDate.setMonth(now.getMonth() - 1);
        if (timeRange === '3M') cutoffDate.setMonth(now.getMonth() - 3);
        if (timeRange === '6M') cutoffDate.setMonth(now.getMonth() - 6);
        if (timeRange === '1Y') cutoffDate.setFullYear(now.getFullYear() - 1);
        if (timeRange === '3Y') cutoffDate.setFullYear(now.getFullYear() - 3);
        if (timeRange === '6Y') cutoffDate.setFullYear(now.getFullYear() - 6);

        return chartData.filter(d => new Date(d.date) >= cutoffDate);
    };

    const filteredData = getFilteredData();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-slate-400 animate-pulse">Laden van dashboard data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">
                Error: {error}
            </div>
        );
    }

    // --- 1. Stat Calculation (Based on FILTERED Data) ---
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : (chartData.length > 0 ? chartData[chartData.length - 1] : null);

    // Display Manual FTP if set, otherwise from latest activity
    const displayFtp = manualFtp || latest?.ftp || 0;

    // Find max eFTP in the filtered dataset
    const maxEftp = filteredData.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);

    // Find latest valid eFTP
    const lastValidEftp = [...filteredData].reverse().find(d => d.eFTP > 0)?.eFTP || 0;

    const currentLoad = latest?.load || 0;
    const totalActivities = filteredData.length;

    const ranges = ['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
                    <p className="text-slate-400 text-sm">Performance metrics overview</p>
                </div>

                {/* TIME FILTER BUTTONS */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {ranges.map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === range
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

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

                    <div className="h-[350px] w-full">
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
        </div>
    );
};
export default Dashboard;