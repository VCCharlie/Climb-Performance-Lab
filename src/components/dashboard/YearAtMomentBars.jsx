import React, { useMemo } from 'react';
import { formatNlNumber } from '../../utils/formatters';
import {
    compareYearPaletteColor,
} from '../../utils/compareYearBarColors';

function metricValue(row, metricId) {
    if (metricId === 'distanceKm') return row.distanceKm;
    if (metricId === 'elevationM') return row.elevationM;
    if (metricId === 'movingTimeSec') return row.movingTimeSec / 3600;
    if (metricId === 'peakEftp20') return row.peakEftp20;
    if (metricId === 'peakBest20min') return row.peakBest20min;
    if (metricId === 'peakBest60min') return row.peakBest60min;
    return row.load;
}

function formatMetric(metricId, value) {
    if (metricId === 'distanceKm') {
        return `${formatNlNumber(value, 0)} km`;
    }
    if (metricId === 'elevationM') {
        return `${formatNlNumber(Math.round(value), 0)} m`;
    }
    if (metricId === 'movingTimeSec') {
        const h = Number(value) || 0;
        return h >= 10 ? `${h.toFixed(1)} h` : `${h.toFixed(2)} h`;
    }
    if (metricId === 'peakEftp20' || metricId === 'peakBest20min' || metricId === 'peakBest60min') {
        const w = Math.round(Number(value) || 0);
        return w > 0 ? `${w} W` : '—';
    }
    return formatNlNumber(Math.round(value), 0);
}

/**
 * Horizontal year bars (Strava Year Review style) with value-based color gradation.
 */
const YearAtMomentBars = ({ rows, metricId, currentYear }) => {
    const sorted = useMemo(
        () => [...(rows || [])].sort((a, b) => b.year - a.year),
        [rows],
    );

    const yearsInChart = useMemo(() => sorted.map((row) => row.year), [sorted]);

    const max = useMemo(() => {
        const values = sorted.map((row) => metricValue(row, metricId));
        let m = 0;
        for (const v of values) {
            const n = Number(v) || 0;
            if (n > m) m = n;
        }
        return m > 0 ? m : 1;
    }, [sorted, metricId]);

    if (!sorted.length) {
        return <p className="text-xs text-cdmuted">No data for this metric.</p>;
    }

    return (
        <div className="space-y-2">
            {sorted.map((row) => {
                const value = metricValue(row, metricId);
                const pct = Math.max(4, (value / max) * 100);
                const isCurrent = row.year === currentYear;
                const barColor = compareYearPaletteColor(row.year, yearsInChart);

                return (
                    <div key={row.year} className="flex items-center gap-2 text-xs">
                        <span className={`w-10 shrink-0 tabular-nums ${isCurrent ? 'text-cdaccent font-bold' : 'text-cdmuted'}`}>
                            {row.year}
                        </span>
                        <div
                            className={`flex-1 h-5 rounded bg-cdbg/70 overflow-hidden ${
                                isCurrent ? 'ring-1 ring-cdaccent/60 border border-cdaccent/40' : 'border border-cdborder/40'
                            }`}
                        >
                            <div
                                className="h-full rounded-sm transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                                title={`${row.year}: ${formatMetric(metricId, value)}`}
                            />
                        </div>
                        <span className={`w-24 shrink-0 text-right tabular-nums ${isCurrent ? 'text-cdtext font-semibold' : 'text-cdmuted'}`}>
                            {formatMetric(metricId, value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default YearAtMomentBars;
