import React, { useMemo } from 'react';
import { formatNlNumber } from '../../utils/formatters';
import {
    compareYearBarColor,
    compareYearValueSpan,
    normalizeCompareYearValue,
} from '../../utils/compareYearBarColors';

function metricValue(row, metricId) {
    if (metricId === 'distanceKm') return row.distanceKm;
    if (metricId === 'elevationM') return row.elevationM;
    if (metricId === 'movingTimeSec') return row.movingTimeSec / 3600;
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

    const { max, span } = useMemo(() => {
        const values = sorted.map((row) => metricValue(row, metricId));
        const valueSpan = compareYearValueSpan(values);
        const barMax = valueSpan.max > 0 ? valueSpan.max : 1;
        return { max: barMax, span: valueSpan };
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
                const norm = normalizeCompareYearValue(value, span);
                const barColor = compareYearBarColor(norm, { isCurrentYear: isCurrent });

                return (
                    <div key={row.year} className="flex items-center gap-2 text-xs">
                        <span className={`w-10 shrink-0 font-mono tabular-nums ${isCurrent ? 'text-cdaccent font-bold' : 'text-cdmuted'}`}>
                            {row.year}
                        </span>
                        <div className="flex-1 h-5 rounded bg-cdbg/70 border border-cdborder/40 overflow-hidden">
                            <div
                                className="h-full rounded-sm transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                                title={`${row.year}: ${formatMetric(metricId, value)}`}
                            />
                        </div>
                        <span className={`w-24 shrink-0 text-right font-mono tabular-nums ${isCurrent ? 'text-cdtext font-semibold' : 'text-cdmuted'}`}>
                            {formatMetric(metricId, value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default YearAtMomentBars;
