/**
 * Build a simple CSV from activity objects (Intervals-style columns).
 */

import { ACTIVITY_COLUMNS } from '../config';

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/**
 * @param {object[]} activities
 * @returns {string}
 */
export function activitiesToCsv(activities) {
    if (!activities?.length) return '';
    const keys = ACTIVITY_COLUMNS
        .filter((c) => !c.hideInTable && !c.omitFromExport)
        .map((c) => c.key);
    const header = keys.join(',');
    const rows = activities.map((a) =>
        keys.map((k) => csvEscape(a[k])).join(',')
    );
    return [header, ...rows].join('\r\n');
}
