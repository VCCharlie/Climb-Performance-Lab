import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, LineChart, Line } from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';

const Dashboard = ({ chartData, theme }) => {
    const [timeRange, setTimeRange] = useState('all');

    // Filter Logic
    const filteredData = useMemo(() => {
        if (timeRange === 'all') return chartData;
        const now = new Date();
        const cutoff = new Date();

        switch(timeRange) {
            case '3y': cutoff.setFullYear(now.getFullYear() - 3); break;
            case '2y': cutoff.setFullYear(now.getFullYear() - 2); break;
            case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
            case '6m': cutoff.setMonth(now.getMonth() - 6); break;
            case '3m': cutoff.setMonth(now.getMonth() - 3); break;
            case '1m': cutoff.setMonth(now.getMonth() - 1); break;
            default: return chartData;
        }

        return chartData.filter(d => new Date(d.date) >= cutoff);
    }, [chartData, timeRange]);

    // Theme Styles
    const isDark = theme === 'dark';
    
    // VISUAL UPDATE: Match de stijl van ClimbProfileCard
    // Light mode: Witte achtergrond, border-slate-200, shadow-xl
    const cardClass = isDark 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-slate-200 shadow-xl'; 

    const titleClass = isDark ? 'text-white' : 'text-slate-800';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const axisColor = isDark ? '#94a3b8' : '#64748b';
    
    const tooltipStyle = {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: isDark ? '#334155' : '#cbd5e1',
        color: isDark ? '#f8fafc' : '#1e293b',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    };

    const TimeFilterButtons = () => (
        <div className={`flex gap-1 p-1 rounded-lg self-start overflow-x-auto max-w-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            {['1m', '3m', '6m', '1y', '2y', '3y', 'all'].map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors uppercase ${
                        timeRange === range 
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
                        <TrendingUp className="text-yellow-400" size={20}/> Performance Trend (Load)
                    </h3>
                    <TimeFilterButtons />
                </div>
                
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{fontSize: 12}} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{fontSize: 12}} />
                            <Tooltip contentStyle={tooltipStyle}/>
                            <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Training Load" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* CHART 2: FTP PROGRESSION */}
            <div className={`p-6 rounded-xl border ${cardClass}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className={`text-lg font-bold ${titleClass} flex items-center gap-2`}>
                        <Zap className="text-orange-400" size={20}/> FTP Progression
                    </h3>
                    {/* Filter wordt gedeeld met bovenstaande of kan apart, hier tonen we geen filter om UI rustig te houden, volgt load filter */}
                </div>
                
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" stroke={axisColor} tick={{fontSize: 12}} minTickGap={30} />
                            <YAxis stroke={axisColor} tick={{fontSize: 12}} domain={['dataMin - 10', 'dataMax + 10']} />
                            <Tooltip contentStyle={tooltipStyle}/>
                            <Line type="stepAfter" dataKey="ftp" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{r: 6}} name="FTP (W)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;