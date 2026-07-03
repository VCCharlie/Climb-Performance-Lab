import React, { useMemo } from 'react';
import { chartCardClass } from '../../../utils/chartTheme';

/**
 * ActivityHeatmap — 52-week activity intensity grid.
 *
 * Renders a GitHub-style heatmap of the last 52 weeks (364 days).
 * Color intensity is based on km ridden per day:
 *   Level 0: no activity (empty)
 *   Level 1: 0–15% of max
 *   Level 2: 15–40%
 *   Level 3: 40–70%
 *   Level 4: 70–100% (peak day)
 *
 * @param {object[]} data - Normalized activity array
 */

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

const LEVEL_CLASSES = [
    'bg-cdborder/40',          // 0 = empty
    'bg-orange-500/20',        // 1 = light
    'bg-orange-500/45',        // 2
    'bg-orange-500/75',        // 3
    'bg-orange-500',           // 4 = peak
];

const getLevel = (km, maxKm) => {
    if (!km || maxKm === 0) return 0;
    const p = km / maxKm;
    if (p < 0.15) return 1;
    if (p < 0.40) return 2;
    if (p < 0.70) return 3;
    return 4;
};

const ActivityHeatmap = ({ data }) => {
    const cells = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Build km-per-day map
        const byDay = {};
        data.forEach(a => {
            if (!a.date) return;
            byDay[a.date] = (byDay[a.date] || 0) + (Number(a.distance) || 0);
        });

        const maxKm = Math.max(0, ...Object.values(byDay));

        // Calculate grid start: Monday 52 weeks ago
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dow = today.getDay() || 7; // Mon=1 … Sun=7
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dow - 1));
        const start = new Date(monday);
        start.setDate(monday.getDate() - 51 * 7); // 52 weeks back

        const result = [];
        for (let i = 0; i < 52 * 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            const km = byDay[key] || 0;
            const isFuture = d > today;
            result.push({
                key,
                km,
                level: isFuture ? -1 : getLevel(km, maxKm),
                label: km ? `${key}: ${km.toFixed(1)} km` : key,
            });
        }
        return result;
    }, [data]);

    if (cells.length === 0) {
        return (
            <div className={chartCardClass}>
                <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider mb-4">Activity heatmap</h3>
                <div className="h-24 flex items-center justify-center text-cdmuted text-sm">No heatmap data</div>
            </div>
        );
    }

    // Group cells into 52 columns (weeks) of 7 rows each
    const weeks = [];
    for (let col = 0; col < 52; col++) {
        weeks.push(cells.slice(col * 7, col * 7 + 7));
    }

    return (
        <div className={chartCardClass}>
            <h3 className="text-sm font-bold text-cdtext uppercase tracking-wider mb-4">
                Activity heatmap — last 52 weeks
            </h3>
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-1 min-w-max">
                    {/* Day labels column */}
                    <div className="flex flex-col gap-1 mr-1">
                        {DAY_LABELS.map((label, i) => (
                            <div
                                key={i}
                                className="text-[9px] text-cdmuted font-medium"
                                style={{ height: 13, lineHeight: '13px', width: 14, textAlign: 'right' }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Week columns */}
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                            {week.map((cell) => {
                                const isValid = cell.level >= 0;
                                return (
                                    <div
                                        key={cell.key}
                                        title={isValid ? cell.label : ''}
                                        tabIndex={isValid ? 0 : undefined}
                                        className={`cursor-default cd-transition hover:opacity-75 ${!isValid
                                                ? 'opacity-0'
                                                : `${LEVEL_CLASSES[cell.level]} rounded-sm focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none`
                                            }`}
                                        style={{ width: 13, height: 13 }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] text-cdmuted">Less</span>
                {LEVEL_CLASSES.map((cls, i) => (
                    <div key={i} className={`rounded-sm ${cls}`} style={{ width: 13, height: 13 }} />
                ))}
                <span className="text-[10px] text-cdmuted">More</span>
            </div>
        </div>
    );
};

export default ActivityHeatmap;
