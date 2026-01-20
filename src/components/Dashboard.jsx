import React from 'react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';

const Dashboard = ({ chartData }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full animate-in fade-in">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-yellow-400" size={20}/> Performance Trend
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 12}}/>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc'}}/>
                        <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Training Load" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Dashboard;