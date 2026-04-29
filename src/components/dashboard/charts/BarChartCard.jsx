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
const getYearKey = (dateStr) => dateStr.slice(0, 4); // "YYYY"

const NL_MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const formatMonthLabel = (key) => {
    const [y, m] = key.split('-');
    // Optimization: avoid slow toLocaleString
    return `${NL_MONTHS_SHORT[parseInt(m, 10) - 1]} ${y.slice(-2)}`;
};

const formatWeekLabel = (key) => {
    const d = new Date(key);
    // Optimization: avoid slow toLocaleString
    return `${d.getDate()} ${NL_MONTHS_SHORT[d.getMonth()]}`;
};

const METRIC_FIELD = {
    distance: (a) => Number(a.distance) || 0,
    tss: (a) => Number(a.load) || 0, // 'load' = TSS after normalization
    elevation: (a) => Number(a.climbing) || 0,
    moving_time: (a) => Number(a.moving_time) || 0,
};

const BarChartCard = ({ data, metric, title, unit, color }) => {
    const [groupBy, setGroupBy] = useState('week');
    const [rideType, setRideType] = useState('all'); // 'all', 'indoor', 'outdoor'

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const isTime = metric === 'moving_time';

        const filtered = data.filter(a => {
            if (rideType === 'all') return true;
            const isIndoor = ['VirtualRide', 'VirtualRun'].includes(a.type);
            return rideType === 'indoor' ? isIndoor : !isIndoor;
        });

        const getValue = METRIC_FIELD[metric];
        const map = {};

        filtered.forEach(a => {
            if (!a.date) return;
            let key;
            if (groupBy === 'week') key = getWeekKey(a.date);
            else if (groupBy === 'month') key = getMonthKey(a.date);
            else key = getYearKey(a.date);
            map[key] = (map[key] || 0) + getValue(a);
        });

        return Object.keys(map)
            .sort()
            .map(key => {
                let label;
                if (groupBy === 'week') label = formatWeekLabel(key);
                else if (groupBy === 'month') label = formatMonthLabel(key);
                else label = key; // Year is just the key itself

                let value = map[key];
                if (isTime) {
                    value = Math.round((value / 3600) * 10) / 10; // in uren, 1 decimaal
                } else {
                    value = Math.round(value);
                }

                return { label, value };
            });
    }, [data, metric, groupBy, rideType]);

    const isTime = metric === 'moving_time';

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-5 shadow-xl">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider">{title}</h3>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden text-[11px] font-bold">
                        <button
                            onClick={() => setGroupBy('week')}
                            className={`px-3 py-1 transition-colors ${groupBy === 'week' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'}`}
                        >Week</button>
                        <button
                            onClick={() => setGroupBy('month')}
                            className={`px-3 py-1 transition-colors ${groupBy === 'month' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'}`}
                        >Maand</button>
                         <button
                            onClick={() => setGroupBy('year')}
                            className={`px-3 py-1 transition-colors ${groupBy === 'year' ? 'bg-cdaccent text-white' : 'text-cdmuted hover:text-cdtext'}`}
                        >Jaar</button>
                    </div>
                     <div className="flex bg-cdbg/60 border border-cdborder rounded overflow-hidden text-[11px] font-bold">
                        <button
                            onClick={() => setRideType('all')}
                            className={`px-3 py-1 transition-colors ${rideType === 'all' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                        >Alles</button>
                        <button
                            onClick={() => setRideType('outdoor')}
                            className={`px-3 py-1 transition-colors ${rideType === 'outdoor' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                        >Outdoor</button>
                         <button
                            onClick={() => setRideType('indoor')}
                            className={`px-3 py-1 transition-colors ${rideType === 'indoor' ? 'bg-cdborder text-cdtext shadow' : 'text-cdmuted hover:text-cdtext'}`}
                        >Indoor</button>
                    </div>
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
                                formatter={(val) => [`${val.toLocaleString('nl-NL')} ${isTime ? 'uur' : unit}`, title]}
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
