/**
 * Export selected activities to CSV or Excel (.xlsx).
 */

import { ACTIVITY_COLUMNS } from '../config';
import { formatTime, formatNlNumber, normalizeDate } from './formatters';
import { stravaActivityUrl } from './strava';

const UTF8_BOM = '\uFEFF';

const INTEGER_EXPORT_KEYS = new Set([
    'climbing',
    'norm_power',
    'avg_power',
    'avg_hr',
    'max_hr',
    'work',
    'load',
    'rpe',
    'best_1min',
    'best_5min',
    'best_10min',
    'best_20min',
    'best_60min',
    'best_90min',
    'best_120min',
    'best_150min',
    'best_180min',
    'max_power',
    'avg_altitude',
    'max_altitude',
    'ftp',
]);

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/** Parse numbers stored as EU/US strings (e.g. "72,83" or "73.43"). */
export function parseExportNumber(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number(String(value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** Distance for export: km, including legacy rows that stored meters as a large number. */
export function exportDistanceKm(value) {
    const n = parseExportNumber(value);
    if (n == null || n <= 0) return null;
    return n > 2000 ? n / 1000 : n;
}

const STRAVA_LINK_EXPORT_COLUMN = { key: 'strava_url', label: 'Strava link' };

/** @returns {{ key: string, label: string }[]} */
export function getActivityExportColumns() {
    const base = ACTIVITY_COLUMNS
        .filter((c) => !c.hideInTable && !c.omitFromExport)
        .map((c) => ({ key: c.key, label: c.label }));
    return [...base, STRAVA_LINK_EXPORT_COLUMN];
}

/**
 * @param {unknown} value
 * @param {string} key
 */
export function formatActivityExportCell(value, key) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return '';
    if (key === 'strava_kom_summary') return '';

    if (key === 'date') {
        return normalizeDate(value) || '';
    }

    if (key === 'strava_url') {
        return value || '';
    }

    if (key === 'moving_time') {
        return formatTime(value);
    }

    if (key === 'distance') {
        const km = exportDistanceKm(value);
        if (km == null) return '';
        return formatNlNumber(km, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }

    if (key === 'avg_speed') {
        const n = parseExportNumber(value);
        if (n == null || n <= 0) return '';
        return formatNlNumber(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }

    if (INTEGER_EXPORT_KEYS.has(key)) {
        const n = parseExportNumber(value);
        if (n == null || n <= 0) return '';
        return formatNlNumber(Math.round(n));
    }

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
        columns.map((col) => {
            if (col.key === 'strava_url') {
                return formatActivityExportCell(stravaActivityUrl(activity.strava_id), col.key);
            }
            return formatActivityExportCell(activity[col.key], col.key);
        }),
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
 * @param {import('xlsx').WorkSheet} worksheet
 * @param {import('xlsx').XLSX} XLSX
 * @param {number} stravaColIndex
 * @param {number} dataRowCount — number of activity rows (excludes header)
 */
export function applyStravaHyperlinksToWorksheet(worksheet, XLSX, stravaColIndex, dataRowCount) {
    if (stravaColIndex < 0 || dataRowCount <= 0) return worksheet;

    const colLetter = XLSX.utils.encode_col(stravaColIndex);
    for (let row = 0; row < dataRowCount; row += 1) {
        const ref = `${colLetter}${row + 2}`;
        const cell = worksheet[ref];
        const url = cell?.v;
        if (typeof url !== 'string' || !url.startsWith('http')) continue;

        worksheet[ref] = {
            ...cell,
            l: { Target: url, Tooltip: 'Open activity in Strava' },
        };
    }

    return worksheet;
}

/**
 * @param {object[]} activities
 * @param {import('xlsx').XLSX} XLSX
 * @returns {import('xlsx').WorkSheet}
 */
export function activitiesToXlsxWorksheet(activities, XLSX) {
    const rows = activitiesToExportRows(activities);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const stravaColIndex = getActivityExportColumns().findIndex((c) => c.key === 'strava_url');
    applyStravaHyperlinksToWorksheet(worksheet, XLSX, stravaColIndex, activities?.length ?? 0);
    return worksheet;
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
