import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, LineChart, Line, ComposedChart } from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { enrichChartData } from '../utils/analytics';

const Dashboard = ({ chartData, theme }) => {
    // 1. Persistence
    const [timeRangeLoad, setTimeRangeLoad] = useState(() => localStorage.getItem('dashboard_range_load') || 'all');
    const [timeRangeFtp, setTimeRangeFtp] = useState(() => localStorage.getItem('dashboard_range_ftp') || 'all'); // New independent state

    // 2. Save state
    useEffect(() => { localStorage.setItem('dashboard_range_load', timeRangeLoad); }, [timeRangeLoad]);
    useEffect(() => { localStorage.setItem('dashboard_range_ftp', timeRangeFtp); }, [timeRangeFtp]);

    // 3. Analytics
    const enrichedData = useMemo(() => {
        return enrichChartData(chartData);
    }, [chartData]);

    const filterData = (data, range) => {
        if (range === 'all') return data;
        const now = new Date();
        const cutoff = new Date();
        switch (range) {
            case '3y': cutoff.setFullYear(now.getFullYear() - 3); break;
            case '2y': cutoff.setFullYear(now.getFullYear() - 2); break;
            case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
            case '6m': cutoff.setMonth(now.getMonth() - 6); break;
            case '3m': cutoff.setMonth(now.getMonth() - 3); break;
            case '1m': cutoff.setMonth(now.getMonth() - 1); break;
            default: return data;
        }
        return data.filter(d => new Date(d.date) >= cutoff);
    };

    const filteredLoadData = useMemo(() => filterData(enrichedData, timeRangeLoad), [enrichedData, timeRangeLoad]);
    const filteredFtpData = useMemo(() => filterData(enrichedData, timeRangeFtp), [enrichedData, timeRangeFtp]);

    const isDark = theme === 'dark';

    // UI FIX: Darker cards
    const cardClass = isDark
        ? 'bg-slate-900 border-slate-800' // Darker than slate-800
        : 'bg-white border-slate-200 shadow-xl';

    const titleClass = isDark ? 'text-white' : 'text-slate-800';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0'; // slate-800 line
    const axisColor = isDark ? '#64748b' : '#64748b';

    const tooltipStyle = {
        backgroundColor: isDark ? '#020617' : '#ffffff', // slate-950
        borderColor: isDark ? '#1e293b' : '#cbd5e1',
        color: isDark ? '#f8fafc' : '#1e293b',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        padding: '8px 12px'
    };

    const TimeFilter = ({ current, set }) => (
        <div className={`flex gap-1 p-1 rounded-lg self-start overflow-x-auto max-w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['1m', '3m', '6m', '1y', 'all'].map(range => (
                <button
                    key={range}
                    onClick={() => set(range)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors uppercase ${current === range
                            ? 'bg-blue-500 text-white shadow-sm'
                            : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                        }`}
                >
                    {range}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 h-full animate-in fade-in">
            {/* CHART 1: PERFORMANCE TREND (LOAD) */}
            <div className={`p-6 rounded-xl border ${cardClass}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className={`text-lg font-bold ${titleClass} flex items-center gap-2`}>
                        <TrendingUp className="text-yellow-400" size={20} /> Performance Trend (Load)
                    </h3>
                    <TimeFilter current={timeRangeLoad} set={setTimeRangeLoad} />
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredLoadData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 12 }} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="#3b82f6" fillOpacity={isDark ? 0.2 : 0.1} name="Daily Load" />
                            <Line type="monotone" dataKey="load_trend" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeDasharray="5 5" strokeWidth={2} dot={false} name="Trend" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* CHART 2: FTP PROGRESSION (Dynamic eFTP) */}
            <div className={`p-6 rounded-xl border ${cardClass}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className={`text-lg font-bold ${titleClass} flex items-center gap-2`}>
                        <Zap className="text-orange-400" size={20} /> eFTP Progression (Est. form)
                    </h3>
                    <TimeFilter current={timeRangeFtp} set={setTimeRangeFtp} />
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredFtpData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 12 }} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                            <Tooltip contentStyle={tooltipStyle} />

                            {/* Rolling Avg of eFTP (The main metric now) */}
                            {/* We use connectNulls to bridge gaps in calculation if needed */}
                            <Line type="monotone" dataKey="eFTP_avg" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} connectNulls={true} name="eFTP (30d Avg)" />

                            {/* Trend Line */}
                            <Line type="monotone" dataKey="eFTP_trend" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeDasharray="5 5" strokeWidth={1} dot={false} connectNulls={true} name="Trend" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
