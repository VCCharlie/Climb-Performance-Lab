/**
 * Export selected activities to CSV or Excel (.xlsx).
 */

import { ACTIVITY_COLUMNS } from '../config';

const UTF8_BOM = '\uFEFF';

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/** @returns {{ key: string, label: string }[]} */
export function getActivityExportColumns() {
    return ACTIVITY_COLUMNS
        .filter((c) => !c.hideInTable && !c.omitFromExport)
        .map((c) => ({ key: c.key, label: c.label }));
}

/**
 * @param {unknown} value
 * @param {string} key
 */
export function formatActivityExportCell(value, key) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return '';
    if (key === 'strava_kom_summary') return '';
    return value;
}

/**
 * @param {object[]} activities
 * @returns {string[][]}
 */
export function activitiesToExportRows(activities) {
    const columns = getActivityExportColumns();
    const header = columns.map((c) => c.label);
    const rows = (activities || []).map((activity) =>
        columns.map((col) => formatActivityExportCell(activity[col.key], col.key)),
    );
    return [header, ...rows];
}

/**
 * @param {object[]} activities
 * @returns {string}
 */
export function activitiesToCsv(activities) {
    const rows = activitiesToExportRows(activities);
    if (rows.length <= 1 && !(activities?.length)) return '';
    return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

/**
 * @param {object[]} activities
 * @returns {Blob}
 */
export function activitiesToCsvBlob(activities) {
    const csv = activitiesToCsv(activities);
    return new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' });
}

function exportFilename(ext) {
    return `activities-export-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * @param {object[]} activities
 */
export function downloadActivitiesCsv(activities) {
    if (!activities?.length) return;
    triggerDownload(activitiesToCsvBlob(activities), exportFilename('csv'));
}

/**
 * @param {object[]} activities
 * @param {import('xlsx').XLSX} XLSX
 * @returns {import('xlsx').WorkSheet}
 */
export function activitiesToXlsxWorksheet(activities, XLSX) {
    const rows = activitiesToExportRows(activities);
    return XLSX.utils.aoa_to_sheet(rows);
}

/**
 * @param {object[]} activities
 * @returns {Promise<void>}
 */
export async function downloadActivitiesXlsx(activities) {
    if (!activities?.length) return;
    const XLSX = await import('xlsx');
    const worksheet = activitiesToXlsxWorksheet(activities, XLSX);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activities');
    XLSX.writeFile(workbook, exportFilename('xlsx'));
}
