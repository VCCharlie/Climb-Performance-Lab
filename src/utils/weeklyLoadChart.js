/**
 * Weekly TSS series for Dashboard overview load chart.
 */

import { formatDateDDMMYYYY } from './formatters';
import { addDaysToYmd, ymdToMondayYmd } from './dashboardVolumeTotals';
import { filterActivitiesInRange, sumTss, todayYmd } from './coach/coachHelpers';

function formatWeekLabel(mondayYmd) {
    const sun = addDaysToYmd(mondayYmd, 6);
    const a = formatDateDDMMYYYY(mondayYmd);
    const b = formatDateDDMMYYYY(sun);
    return a === '-' || b === '-' ? mondayYmd : `${a} – ${b}`;
}

/**
 * @param {object[]} activities
 * @param {number} [weekCount]
 * @param {string} [referenceYmd]
 * @returns {Array<{ key: string, label: string, tss: number }>}
 */
export function buildWeeklyTssSeries(activities, weekCount = 12, referenceYmd = todayYmd()) {
    const endMonday = ymdToMondayYmd(referenceYmd);
    if (!endMonday) return [];

    const count = Math.max(1, Math.min(52, Math.round(Number(weekCount) || 12)));
    const series = [];

    for (let i = count - 1; i >= 0; i -= 1) {
        const monday = addDaysToYmd(endMonday, -i * 7);
        if (!monday) continue;
        const sunday = addDaysToYmd(monday, 6);
        const weekActs = filterActivitiesInRange(activities, monday, sunday);
        series.push({
            key: monday,
            label: formatWeekLabel(monday),
            tss: Math.round(sumTss(weekActs)),
        });
    }

    return series;
}
