/**
 * Sport-type mix for Compare tab donut (current period + filters).
 */

import { activityDistanceKm, activityMovingTimeSec } from './activityFilterMetrics.js';
import { normalizeDate } from './formatters.js';
import { comparePeriodWindowForYear } from './comparePeriodWindows.js';
import { filterActivitiesBySportTypes } from './multiYearSameMoment.js';

const CHART_COLORS = [
    'rgba(249,115,22,0.85)',
    'rgba(59,130,246,0.85)',
    'rgba(34,197,94,0.85)',
    'rgba(168,85,247,0.85)',
    'rgba(236,72,153,0.85)',
    'rgba(14,165,233,0.85)',
    'rgba(234,179,8,0.85)',
    'rgba(100,116,139,0.85)',
];

/**
 * @param {object[]} activities
 * @param {import('./comparePeriodWindows.js').ComparePeriodId} period
 * @param {Date} referenceDate
 * @param {Set<string>} sportTypes
 * @param {'distanceKm' | 'count' | 'movingTimeSec'} basis
 */
export function computeSportMixForComparePeriod(
    activities,
    period,
    referenceDate,
    sportTypes,
    basis = 'distanceKm',
) {
    const filtered = filterActivitiesBySportTypes(activities, sportTypes);
    const labelYear = referenceDate.getFullYear();
    const { startYmd, endYmd } = comparePeriodWindowForYear(period, referenceDate, labelYear);

    const byType = new Map();

    for (const act of filtered) {
        const day = normalizeDate(act.date);
        if (!day || day.length < 10) continue;
        const ymd = day.slice(0, 10);
        if (ymd < startYmd || ymd > endYmd) continue;

        const type = act.type || 'Other';
        const prev = byType.get(type) || { type, count: 0, distanceKm: 0, movingTimeSec: 0 };

        prev.count += 1;
        const km = activityDistanceKm(act);
        if (km != null) prev.distanceKm += km;
        const sec = activityMovingTimeSec(act);
        if (sec != null) prev.movingTimeSec += sec;

        byType.set(type, prev);
    }

    const rows = [...byType.values()].sort((a, b) => {
        const av = basis === 'count' ? a.count : basis === 'movingTimeSec' ? a.movingTimeSec : a.distanceKm;
        const bv = basis === 'count' ? b.count : basis === 'movingTimeSec' ? b.movingTimeSec : b.distanceKm;
        return bv - av;
    });

    return rows.map((row, index) => {
        const value = basis === 'count'
            ? row.count
            : basis === 'movingTimeSec'
              ? row.movingTimeSec / 3600
              : row.distanceKm;
        return {
            ...row,
            value,
            color: CHART_COLORS[index % CHART_COLORS.length],
            label: row.type,
        };
    }).filter((r) => r.value > 0);
}

export function formatSportMixValue(basis, value) {
    if (basis === 'count') return `${Math.round(value)} activities`;
    if (basis === 'movingTimeSec') {
        const h = Number(value) || 0;
        return h >= 10 ? `${h.toFixed(1)} h` : `${h.toFixed(2)} h`;
    }
    return `${(Math.round(value * 10) / 10).toFixed(1)} km`;
}
