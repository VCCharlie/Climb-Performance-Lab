import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, LineChart, Line, ComposedChart } from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';
import { enrichChartData } from '../utils/analytics';

const Dashboard = ({ chartData, theme }) => {
    // 1. Persistence: Load initial state from localStorage
    const [timeRange, setTimeRange] = useState(() => localStorage.getItem('dashboard_range') || 'all');

    // 2. Persistence: Save state on change
    useEffect(() => {
        localStorage.setItem('dashboard_range', timeRange);
    }, [timeRange]);

    // 3. Analytics: Enrich Data (Rolling Averages & Trends)
    const enrichedData = useMemo(() => {
        return enrichChartData(chartData);
    }, [chartData]);

    // 4. Filter Logic
    const filteredData = useMemo(() => {
        if (timeRange === 'all') return enrichedData;
        const now = new Date();
        const cutoff = new Date();

        switch (timeRange) {
            case '3y': cutoff.setFullYear(now.getFullYear() - 3); break;
            case '2y': cutoff.setFullYear(now.getFullYear() - 2); break;
            case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
            case '6m': cutoff.setMonth(now.getMonth() - 6); break;
            case '3m': cutoff.setMonth(now.getMonth() - 3); break;
            case '1m': cutoff.setMonth(now.getMonth() - 1); break;
            default: return enrichedData;
        }

        return enrichedData.filter(d => new Date(d.date) >= cutoff);
    }, [enrichedData, timeRange]);

    // Theme Styles
    const isDark = theme === 'dark';

    const cardClass = isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-slate-200 shadow-xl';

    const titleClass = isDark ? 'text-white' : 'text-slate-800';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const axisColor = isDark ? '#94a3b8' : '#64748b';

    // Improved Tooltip Style
    const tooltipStyle = {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        color: isDark ? '#f8fafc' : '#1e293b',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        padding: '8px 12px'
    };

    const TimeFilterButtons = () => (
        <div className={`flex gap-1 p-1 rounded-lg self-start overflow-x-auto max-w-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            {['1m', '3m', '6m', '1y', '2y', '3y', 'all'].map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors uppercase ${timeRange === range
                            ? 'bg-yellow-400 text-slate-900 shadow-sm'
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
                    <TimeFilterButtons />
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 12 }} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="#3b82f6" fillOpacity={isDark ? 0.2 : 0.1} name="Daily Load" />
                            {/* Trend Line (Linear Regression) */}
                            <Line type="monotone" dataKey="load_trend" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeDasharray="5 5" strokeWidth={2} dot={false} name="Trend" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* CHART 2: FTP PROGRESSION (Rolling Average + Trend) */}
            <div className={`p-6 rounded-xl border ${cardClass}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className={`text-lg font-bold ${titleClass} flex items-center gap-2`}>
                        <Zap className="text-orange-400" size={20} /> FTP Progression (30d Rolling)
                    </h3>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 12 }} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                            <Tooltip contentStyle={tooltipStyle} />

                            {/* Raw FTP Steps (Ghosted) */}
                            <Line type="stepAfter" dataKey="ftp" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth={1} dot={false} name="Raw Input" />

                            {/* Rolling Avg (Main Curve) */}
                            <Line type="monotone" dataKey="ftp_avg" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="30d Avg FTP" />

                            {/* Trend Line */}
                            <Line type="monotone" dataKey="ftp_trend" stroke={isDark ? "#94a3b8" : "#cbd5e1"} strokeDasharray="5 5" strokeWidth={2} dot={false} name="Trend" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
