import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';

/**
 * BarChartCard — Reusable bar chart for a single metric (distance, tss or elevation).
 * Each card has its own independent Week / Month toggle.
 *
 * @param {object[]} data     - Normalized activity array (from Dashboard)
 * @param {'distance'|'tss'|'elevation'} metric
 * @param {string}   title    - Card header label
 * @param {string}   unit     - Unit suffix shown in tooltip & axis
 * @param {string}   color    - Hex / CSS color for the bars
 */

// Returns "YYYY-Www" (ISO week) for a given date string
const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay() || 7; // Mon = 1 … Sun = 7
    d.setDate(d.getDate() + 1 - day); // set to Mon of this week
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD" of Monday
};

const getMonthKey = (dateStr) => dateStr.slice(0, 7); // "YYYY-MM"

const formatMonthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(y, m - 1).toLocaleString('nl-NL', { month: 'short', year: '2-digit' });
};

const formatWeekLabel = (key) => {
    const d = new Date(key);
    return `${d.getDate()} ${d.toLocaleString('nl-NL', { month: 'short' })}`;
};

const METRIC_FIELD = {
    distance: (a) => Number(a.distance) || 0,
    tss: (a) => Number(a.load) || 0, // 'load' = TSS after normalization
    elevation: (a) => Number(a.climbing) || 0,
};

const BarChartCard = ({ data, metric, title, unit, color }) => {
    const [groupBy, setGroupBy] = useState('week');

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const getValue = METRIC_FIELD[metric];
        const map = {};

        data.forEach(a => {
            if (!a.date) return;
            const key = groupBy === 'week' ? getWeekKey(a.date) : getMonthKey(a.date);
            map[key] = (map[key] || 0) + getValue(a);
        });

        return Object.keys(map)
            .sort()
            .map(key => ({
                label: groupBy === 'week' ? formatWeekLabel(key) : formatMonthLabel(key),
                value: Math.round(map[key]),
            }));
    }, [data, metric, groupBy]);

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">{title}</h3>
                <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden text-[11px] font-bold">
                    <button
                        onClick={() => setGroupBy('week')}
                        className={`px-3 py-1 transition-colors ${groupBy === 'week' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'}`}
                    >Week</button>
                    <button
                        onClick={() => setGroupBy('month')}
                        className={`px-3 py-1 transition-colors ${groupBy === 'month' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'}`}
                    >Maand</button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-cdmuted text-sm">
                    Geen data in deze periode
                </div>
            ) : (
                <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                interval="preserveStartEnd"
                                minTickGap={groupBy === 'week' ? 40 : 20}
                            />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={36} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', fontSize: 12 }}
                                formatter={(val) => [`${val.toLocaleString('nl-NL')} ${unit}`, title]}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            />
                            <Bar dataKey="value" name={title} fill={color} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default BarChartCard;
