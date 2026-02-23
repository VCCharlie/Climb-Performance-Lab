import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import PowerCurveChart from './charts/PowerCurveChart';

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

// Zelfde plafonds als PowerCurveChart — filtert data-artefacten vóór Math.max.
const FTP_CAPS = {
    best_1min:  4.0,
    best_5min:  2.2,
    best_10min: 1.6,
    best_20min: 1.3,
    best_60min: 1.1,
};

const cappedMax = (activities, key, manualFtp) => {
    const cap = manualFtp > 0 ? manualFtp * FTP_CAPS[key] : 1500;
    return Math.max(0, ...activities.map(a => Number(a[key]) || 0).filter(v => v <= cap));
};

const PowerTab = ({ data, manualFtp }) => {
    const weightKg = 75; // TODO: derive from userSettings if passed as prop

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;

        const best1m  = cappedMax(data, 'best_1min',  manualFtp);
        const best5m  = cappedMax(data, 'best_5min',  manualFtp);
        const best20m = cappedMax(data, 'best_20min', manualFtp);
        const best60m = cappedMax(data, 'best_60min', manualFtp);

        const eFTP = best20m > 0 ? Math.round(best20m * 0.95) : 0;
        const eFTPkg = eFTP > 0 ? (eFTP / weightKg).toFixed(2) : null;
        const wkg20m = best20m > 0 ? (best20m / weightKg).toFixed(2) : null;

        return { best1m, best5m, best20m, best60m, eFTP, eFTPkg, wkg20m };
    }, [data, manualFtp]);

    const monthlyBests = useMemo(() => {
        if (!data || data.length === 0) return [];

        const cap5  = manualFtp > 0 ? manualFtp * FTP_CAPS.best_5min  : 1500;
        const cap20 = manualFtp > 0 ? manualFtp * FTP_CAPS.best_20min : 1500;
        const cap60 = manualFtp > 0 ? manualFtp * FTP_CAPS.best_60min : 1500;

        const map = {};
        data.forEach(a => {
            const mo = getMonthKey(a.date);
            if (!map[mo]) map[mo] = { b5: 0, b20: 0, b60: 0 };
            const v5  = Number(a.best_5min)  || 0;
            const v20 = Number(a.best_20min) || 0;
            const v60 = Number(a.best_60min) || 0;
            if (v5  <= cap5  && v5  > map[mo].b5)  map[mo].b5  = v5;
            if (v20 <= cap20 && v20 > map[mo].b20) map[mo].b20 = v20;
            if (v60 <= cap60 && v60 > map[mo].b60) map[mo].b60 = v60;
        });

        // Sleutelnamen beginnen met a/b/c zodat Recharts de legenda altijd
        // in de juiste volgorde toont: 5 - 20 - 60 (alfabetisch a < b < c).
        return Object.keys(map).sort().map(mo => {
            const [y, m] = mo.split('-');
            const label = new Date(y, m - 1).toLocaleString('nl-NL', { month: 'short', year: '2-digit' });
            return {
                label,
                'a_5min':  map[mo].b5  || null,
                'b_20min': map[mo].b20 || null,
                'c_60min': map[mo].b60 || null,
            };
        });
    }, [data, manualFtp]);

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
                                formatter={(value, name) => {
                                    const labels = { 'a_5min': '5 min', 'b_20min': '20 min', 'c_60min': '60 min' };
                                    return [value ? `${value} W` : '-', labels[name] ?? name];
                                }}
                            />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ paddingTop: '16px' }}
                                formatter={(value) => {
                                    const labels = { 'a_5min': '5 min', 'b_20min': '20 min', 'c_60min': '60 min' };
                                    return labels[value] ?? value;
                                }}
                            />
                            <Line type="monotone" dataKey="a_5min"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="b_20min" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="c_60min" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Power Curve (MMP) */}
            <PowerCurveChart data={data} manualFtp={manualFtp} />
        </div>
    );
};

export default PowerTab;
