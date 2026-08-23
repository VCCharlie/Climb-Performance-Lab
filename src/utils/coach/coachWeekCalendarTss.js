/**
 * Per-day TSS for fluid week calendar bubbles (actual logged + planned estimate).
 */

import { normalizeDate } from '../formatters';
import { resolveSessionTssForForecast } from './coachSessionTss';

/**
 * @param {object[]} activities
 * @returns {Record<string, number>}
 */
export function buildActualTssByDate(activities) {
    const map = {};
    for (const a of activities || []) {
        const ymd = normalizeDate(a?.date);
        const load = Number(a?.load) || 0;
        if (!ymd || load <= 0) continue;
        map[ymd] = (map[ymd] || 0) + load;
    }
    return map;
}

/**
 * @param {{ sessions?: object[] }} weekPlan
 * @param {object[]} activities
 * @param {number} [weeklyHours]
 * @returns {Record<string, number>}
 */
export function buildWeekDayTssMap(weekPlan, activities, weeklyHours = 5) {
    const actualTssByDate = buildActualTssByDate(activities);
    const map = {};
    const sessions = weekPlan?.sessions || [];

    for (const session of sessions) {
        const date = session?.date;
        if (!date) continue;
        const tss = resolveSessionTssForForecast(session, weeklyHours, actualTssByDate);
        if (tss > 0) map[date] = tss;
    }

    return map;
}

/**
 * Bubble diameter in px (8–28) proportional to TSS within the week.
 * @param {number} tss
 * @param {number} maxTss
 * @returns {number}
 */
export function tssBubbleSizePx(tss, maxTss) {
    const n = Number(tss) || 0;
    const max = Number(maxTss) || 0;
    if (n <= 0 || max <= 0) return 0;
    const ratio = Math.min(1, n / max);
    return Math.round(8 + ratio * 20);
}
