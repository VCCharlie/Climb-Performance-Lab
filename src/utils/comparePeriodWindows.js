/**
 * Calendar / rolling windows for Dashboard Compare tab (multi-year, same end date).
 */

import { ytdComparisonWindows } from './ytdYearOverYear.js';

/** @typedef {'month' | 'ytd' | '365d' | 'running_year' | 'all'} ComparePeriodId */

export const COMPARE_PERIODS = [
    { id: 'month', label: 'Month' },
    { id: 'ytd', label: 'YTD' },
    { id: '365d', label: '365d' },
    { id: 'running_year', label: 'Running year' },
    { id: 'all', label: 'All' },
];

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** @param {Date} d */
export function toYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Window for one labelled year (the bar label = end-year of the period).
 * @param {ComparePeriodId} period
 * @param {Date} referenceDate
 * @param {number} labelYear
 * @returns {{ startYmd: string, endYmd: string }}
 */
export function comparePeriodWindowForYear(period, referenceDate, labelYear) {
    const ref = new Date(
        labelYear,
        referenceDate.getMonth(),
        referenceDate.getDate(),
        0,
        0,
        0,
        0,
    );

    if (period === 'month') {
        const start = new Date(labelYear, referenceDate.getMonth(), 1);
        return { startYmd: toYmd(start), endYmd: toYmd(ref) };
    }

    if (period === 'ytd') {
        const win = ytdComparisonWindows(ref);
        return { startYmd: win.startThis, endYmd: win.endThis };
    }

    if (period === '365d') {
        const end = ref;
        const start = new Date(ref);
        start.setDate(start.getDate() - 364);
        return { startYmd: toYmd(start), endYmd: toYmd(end) };
    }

    if (period === 'running_year') {
        const end = ref;
        const start = new Date(ref);
        start.setFullYear(start.getFullYear() - 1);
        start.setDate(start.getDate() + 1);
        return { startYmd: toYmd(start), endYmd: toYmd(end) };
    }

    if (period === 'all') {
        const end = labelYear === referenceDate.getFullYear()
            ? ref
            : new Date(labelYear, 11, 31);
        return {
            startYmd: `${labelYear}-01-01`,
            endYmd: toYmd(end),
        };
    }

    const win = ytdComparisonWindows(ref);
    return { startYmd: win.startThis, endYmd: win.endThis };
}

/**
 * @param {ComparePeriodId} period
 * @param {Date} referenceDate
 */
export function comparePeriodSubtitle(period, referenceDate) {
    const refLabel = referenceDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const monthName = referenceDate.toLocaleDateString('en-GB', { month: 'long' });

    switch (period) {
        case 'month':
            return `${monthName} 1 – ${refLabel} (same slice each year)`;
        case 'ytd':
            return `1 Jan – ${refLabel} each year`;
        case '365d':
            return `Rolling 365 days ending ${refLabel} each year`;
        case 'running_year':
            return `Rolling 12 months ending ${refLabel} each year`;
        case 'all':
            return `Full calendar year (current year through ${refLabel})`;
        default:
            return refLabel;
    }
}
