import { MONTH_ORDER } from '../config';

/**
 * Limit climb matching to activities that are actually shown in the log UI.
 * Avoids matching thousands of rows in collapsed year/month groups.
 *
 * @param {object[]} logTableActivities — rows currently driving the table/cards
 * @param {boolean} logTableGrouped
 * @param {Record<string, Record<string, object[]>> | null} groupedActivities
 * @param {{ direction?: string }} sortConfig
 * @param {(year: string) => boolean} isYearExpanded
 * @param {(year: string, month: string) => boolean} isMonthExpanded
 */
export function selectActivitiesForClimbMatch(
    logTableActivities,
    logTableGrouped,
    groupedActivities,
    sortConfig,
    isYearExpanded,
    isMonthExpanded,
) {
    if (!logTableActivities?.length) return [];

    if (!logTableGrouped || !groupedActivities) {
        return logTableActivities;
    }

    const visibleIds = new Set();
    const years = Object.keys(groupedActivities).sort((a, b) =>
        sortConfig?.direction === 'asc' ? Number(a) - Number(b) : Number(b) - Number(a),
    );

    for (const year of years) {
        if (!isYearExpanded(year)) continue;
        const months = Object.keys(groupedActivities[year]).sort((a, b) => {
            const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
            return sortConfig?.direction === 'asc' ? -diff : diff;
        });
        for (const month of months) {
            if (!isMonthExpanded(year, month)) continue;
            for (const act of groupedActivities[year][month] || []) {
                if (act?.id != null) visibleIds.add(String(act.id));
            }
        }
    }

    if (visibleIds.size === 0) return [];

    return logTableActivities.filter((act) => visibleIds.has(String(act.id)));
}
