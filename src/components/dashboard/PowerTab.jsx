import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';

/**
 * PowerTab: Shows power-specific metrics:
 *   - Stat cards: 1min, 5min, 20min, 60min best, eFTP, W/kg
 *   - Best efforts per month (5 / 20 / 60 min) chart
 */

const getMonthKey = (dateStr) => dateStr.slice(0, 7);

const StatCard = ({ label, value, unit, color = 'text-cdtext' }) => (
    <div className="bg-cdsurface border border-cdborder rounded-lg p-4">
        <div className="text-xs uppercase text-cdmuted font-bold tracking-wider mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>
            {value ?? '—'}
            {value && unit && <span className="text-sm font-normal text-cdmuted ml-1">{unit}</span>}
        </div>
    </div>
);

const PowerTab = ({ data }) => {
    const weightKg = 75; // TODO: derive from userSettings if passed as prop

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;

        const best1m = Math.max(0, ...data.map(a => a.best_1min || 0));
        const best5m = Math.max(0, ...data.map(a => a.best_5min || 0));
        const best20m = Math.max(0, ...data.map(a => a.best_20min || 0));
        const best60m = Math.max(0, ...data.map(a => a.best_60min || 0));

        const eFTP = best20m > 0 ? Math.round(best20m * 0.95) : 0;
        const eFTPkg = eFTP > 0 ? (eFTP / weightKg).toFixed(2) : null;
        const wkg20m = best20m > 0 ? (best20m / weightKg).toFixed(2) : null;

        return { best1m, best5m, best20m, best60m, eFTP, eFTPkg, wkg20m };
    }, [data]);

    const monthlyBests = useMemo(() => {
        if (!data || data.length === 0) return [];

        const map = {};
        data.forEach(a => {
            const mo = getMonthKey(a.date);
            if (!map[mo]) map[mo] = { b5: 0, b20: 0, b60: 0 };
            if ((a.best_5min || 0) > map[mo].b5) map[mo].b5 = a.best_5min;
            if ((a.best_20min || 0) > map[mo].b20) map[mo].b20 = a.best_20min;
            if ((a.best_60min || 0) > map[mo].b60) map[mo].b60 = a.best_60min;
        });

        return Object.keys(map).sort().map(mo => {
            const [y, m] = mo.split('-');
            const label = new Date(y, m - 1).toLocaleString('nl-NL', { month: 'short', year: '2-digit' });
            return {
                label,
                '5 min': map[mo].b5 || null,
                '20 min': map[mo].b20 || null,
                '60 min': map[mo].b60 || null,
            };
        });
    }, [data]);

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-40 text-cdmuted">
                Geen vermogensdata gevonden voor deze periode.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="1 min Best" value={stats.best1m || null} unit="W" />
                <StatCard label="5 min Best" value={stats.best5m || null} unit="W" color="text-blue-400" />
                <StatCard label="20 min Best" value={stats.best20m || null} unit="W" />
                <StatCard label="60 min Best" value={stats.best60m || null} unit="W" color="text-blue-400" />
                <StatCard label="eFTP" value={stats.eFTP || null} unit="W" color="text-green-400" />
                <StatCard label="eFTP W/kg" value={stats.eFTPkg || null} unit="w/kg" color="text-green-400" />
                <StatCard label="20m W/kg" value={stats.wkg20m || null} unit="w/kg" />
            </div>

            {/* Best efforts per month chart */}
            <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-cdtext mb-4">Best efforts per maand (W)</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={monthlyBests}
                            margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                stroke="#64748b"
                                tick={{ fontSize: 11 }}
                                interval={0}
                                minTickGap={30}
                            />
                            <YAxis stroke="#64748b" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                itemStyle={{ color: '#94a3b8' }}
                                itemSorter={(item) => {
                                    // Force tooltip rows to appear in 5 → 20 → 60 order
                                    const order = { '5 min': 0, '20 min': 1, '60 min': 2 };
                                    return order[item.name] ?? 99;
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                            <Line
                                type="monotone"
                                dataKey="5 min"
                                name="5 min"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="20 min"
                                name="20 min"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                            />
                            <Line
                                type="monotone"
                                dataKey="60 min"
                                name="60 min"
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default PowerTab;
