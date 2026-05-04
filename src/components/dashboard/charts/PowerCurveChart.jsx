import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';

/**
 * PowerCurveChart — Mean Maximal Power (MMP) curve.
 *
 * Derives the all-time peak power for each effort duration (1m, 5m, 10m, 20m, 60m)
 * from the best-effort fields stored per activity.
 *
 * @param {object[]} data - Normalized activity array (from Dashboard filtered period)
 */

const DURATIONS = [
    { key: 'best_1min',  label: '1m',  secs: 60 },
    { key: 'best_5min',  label: '5m',  secs: 300 },
    { key: 'best_10min', label: '10m', secs: 600 },
    { key: 'best_20min', label: '20m', secs: 1200 },
    { key: 'best_60min', label: '60m', secs: 3600 },
];

// Physiologically plausible max ratio vs FTP per effort duration.
// Values above this ceiling are treated as data artefacts and ignored.
const FTP_CAPS = {
    best_1min:  4.0,  // Sprint: max 4× FTP
    best_5min:  2.2,  // VO2max: max 2.2× FTP
    best_10min: 1.6,  // Well above threshold
    best_20min: 1.3,  // Just above FTP
    best_60min: 1.1,  // At or slightly below FTP
};

const PowerCurveChart = ({ data, manualFtp }) => {
    const curveData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return DURATIONS.map(({ key, label }) => {
            // Apply sanity cap when FTP is known; otherwise use absolute ceiling of 1500 W
            const cap = manualFtp > 0 ? manualFtp * FTP_CAPS[key] : 1500;
            const peak = Math.max(0, ...data
                .map(a => Number(a[key]) || 0)
                .filter(v => v <= cap)
            );
            return { label, watts: peak > 0 ? peak : null };
        }).filter(p => p.watts !== null);
    }, [data, manualFtp]);

    if (curveData.length === 0) {
        return (
            <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-cdtext mb-2">Power Curve (MMP)</h3>
                <div className="h-48 flex items-center justify-center text-cdmuted text-sm">
                    No best-effort data available in this period.
                </div>
            </div>
        );
    }

    // Show a horizontal line for 20-min power (eFTP reference)
    const best20m = curveData.find(p => p.label === '20m')?.watts;
    const eFTP = best20m ? Math.round(best20m * 0.95) : null;

    return (
        <div className="bg-cdsurface border border-cdborder rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cdtext">Power Curve (MMP)</h3>
                {eFTP && (
                    <span className="text-xs text-cdmuted bg-cdborder/50 px-2 py-1 rounded">
                        eFTP reference: <strong className="text-green-400">{eFTP} W</strong>
                    </span>
                )}
            </div>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={curveData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="mmpGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke="#64748b"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(v) => `${v}W`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(v) => [`${v} W`, 'MMP']}
                            itemStyle={{ color: '#f97316' }}
                        />
                        {eFTP && (
                            <ReferenceLine
                                y={eFTP}
                                stroke="#22c55e"
                                strokeDasharray="6 3"
                                label={{ value: `eFTP ${eFTP}W`, fill: '#22c55e', fontSize: 10, dy: -6 }}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="watts"
                            name="MMP"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            fill="url(#mmpGradient)"
                            dot={{ r: 5, fill: '#f97316', strokeWidth: 0 }}
                            activeDot={{ r: 7 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-cdmuted mt-2">
                Based on best effort per activity in the selected period.
            </p>
        </div>
    );
};

export default PowerCurveChart;
