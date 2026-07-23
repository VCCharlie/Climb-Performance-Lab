import { MONTH_ORDER } from '../config';

/** Start virtualizing when flattened row count reaches this threshold. */
export const ACTIVITY_LIST_VIRTUALIZE_THRESHOLD = 60;

export const FLATTENED_ROW_ESTIMATE_PX = {
    selectAll: 44,
    year: 44,
    month: 36,
    activity: 128,
    tableYear: 40,
    tableMonth: 32,
    tableActivity: 52,
};

/**
 * @typedef {'selectAll' | 'year' | 'month' | 'activity'} FlattenedRowType
 * @typedef {{ type: FlattenedRowType, year?: string, month?: string, act?: object }} FlattenedRow
 */

export function sortGroupedYears(years, direction = 'desc') {
    return [...years].sort((a, b) => (direction === 'asc' ? a - b : b - a));
}

export function sortGroupedMonths(months, direction = 'desc') {
    return [...months].sort((a, b) => {
        const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
        return direction === 'asc' ? -diff : diff;
    });
}

/**
 * Flatten grouped or flat activity data into a linear list for virtualization.
 * Respects year/month expand state so collapsed groups do not render child rows.
 *
 * @param {object} params
 * @param {object[] | Record<string, Record<string, object[]>>} params.activities
 * @param {boolean} params.isGroupedView
 * @param {{ direction?: 'asc' | 'desc' }} [params.sortConfig]
 * @param {(year: string) => boolean} [params.isYearExpanded]
 * @param {(year: string, month: string) => boolean} [params.isMonthExpanded]
 * @param {boolean} [params.includeSelectAll]
 * @returns {FlattenedRow[]}
 */
export function flattenActivityList({
    activities,
    isGroupedView,
    sortConfig = { direction: 'desc' },
    isYearExpanded = () => true,
    isMonthExpanded = () => true,
    includeSelectAll = false,
}) {
    /** @type {FlattenedRow[]} */
    const rows = [];

    if (includeSelectAll) {
        rows.push({ type: 'selectAll' });
    }

    if (!activities) return rows;

    if (isGroupedView) {
        const direction = sortConfig.direction === 'asc' ? 'asc' : 'desc';
        sortGroupedYears(Object.keys(activities), direction).forEach((year) => {
            rows.push({ type: 'year', year });
            if (!isYearExpanded(year)) return;

            sortGroupedMonths(Object.keys(activities[year] || {}), direction).forEach((month) => {
                rows.push({ type: 'month', year, month });
                if (!isMonthExpanded(year, month)) return;

                (activities[year][month] || []).forEach((act) => {
                    rows.push({ type: 'activity', act });
                });
            });
        });
        return rows;
    }

    if (Array.isArray(activities)) {
        activities.forEach((act) => {
            rows.push({ type: 'activity', act });
        });
    }

    return rows;
}

/**
 * @param {FlattenedRow} row
 * @param {'card' | 'table'} [layout]
 */
export function estimateFlattenedRowSize(row, layout = 'card') {
    if (!row) return FLATTENED_ROW_ESTIMATE_PX.activity;
    if (row.type === 'selectAll') return FLATTENED_ROW_ESTIMATE_PX.selectAll;
    if (row.type === 'year') {
        return layout === 'table' ? FLATTENED_ROW_ESTIMATE_PX.tableYear : FLATTENED_ROW_ESTIMATE_PX.year;
    }
    if (row.type === 'month') {
        return layout === 'table' ? FLATTENED_ROW_ESTIMATE_PX.tableMonth : FLATTENED_ROW_ESTIMATE_PX.month;
    }
    return layout === 'table' ? FLATTENED_ROW_ESTIMATE_PX.tableActivity : FLATTENED_ROW_ESTIMATE_PX.activity;
}

/**
 * @param {FlattenedRow} row
 * @param {number} index
 */
export function getFlattenedRowKey(row, index) {
    if (row.type === 'selectAll') return 'select-all';
    if (row.type === 'year') return `year-${row.year}`;
    if (row.type === 'month') return `month-${row.year}-${row.month}`;
    if (row.type === 'activity') return `act-${row.act?.id ?? index}`;
    return `row-${index}`;
}

/**
 * @param {FlattenedRow[]} rows
 */
export function countFlattenedActivities(rows) {
    return rows.reduce((n, row) => (row.type === 'activity' ? n + 1 : n), 0);
}

/**
 * @param {FlattenedRow[]} rows
 */
export function shouldVirtualizeActivityList(rows) {
    return rows.length >= ACTIVITY_LIST_VIRTUALIZE_THRESHOLD;
}
