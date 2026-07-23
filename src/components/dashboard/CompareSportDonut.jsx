import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartTooltip } from '../ui';
import { chartCardClass } from '../../utils/chartTheme';
import { formatSportMixValue } from '../../utils/compareSportMix';

/**
 * Sport distribution donut for the active Compare period (current year window).
 */
const CompareSportDonut = ({ rows, basis = 'distanceKm' }) => {
    const total = useMemo(
        () => rows.reduce((sum, r) => sum + r.value, 0),
        [rows],
    );

    if (!rows.length || total <= 0) {
        return (
            <div className={chartCardClass}>
                <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-2">Sport mix</h4>
                <p className="text-xs text-cdmuted py-8 text-center">No activities in this period.</p>
            </div>
        );
    }

    return (
        <div className={chartCardClass}>
            <h4 className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-1">Sport mix</h4>
            <p className="text-[10px] text-cdmuted mb-3">Current period · by {basis === 'count' ? 'activity count' : basis === 'movingTimeSec' ? 'hours' : 'distance'}</p>
            <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={rows}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                        >
                            {rows.map((entry) => (
                                <Cell key={entry.label} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={(
                                <ChartTooltip
                                    formatter={(value, name) => `${name}: ${formatSportMixValue(basis, value)}`}
                                />
                            )}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: 10 }}
                            formatter={(value) => <span className="text-cdtext">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CompareSportDonut;
