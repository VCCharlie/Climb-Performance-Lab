/**
 * Export bucket list Done climbs and personal bests (CSV / JSON).
 */

import { formatPbSummary } from './climbPersonalBests';
import { formatPbVenueLabel, resolvePbVenue } from './activityVenue';

const UTF8_BOM = '\uFEFF';

export const BUCKET_LIST_EXPORT_SCHEMA = 'cpl.bucketList.export.v1';

const EXPORT_COLUMNS = [
    { key: 'climbId', label: 'Climb ID' },
    { key: 'name', label: 'Name' },
    { key: 'country', label: 'Country' },
    { key: 'status', label: 'Bucket status' },
    { key: 'lengthKm', label: 'Length km' },
    { key: 'elevationM', label: 'Elevation m' },
    { key: 'avgGradePct', label: 'DB avg grade %' },
    { key: 'pbSummary', label: 'PB summary' },
    { key: 'pbNormPowerW', label: 'PB norm power W' },
    { key: 'pbAvgPowerW', label: 'PB avg power W' },
    { key: 'pbMovingTimeSec', label: 'PB moving time sec' },
    { key: 'pbActivityTitle', label: 'PB activity title' },
    { key: 'pbActivityId', label: 'PB activity id' },
    { key: 'pbMatchSource', label: 'PB match source' },
    { key: 'pbVenue', label: 'PB venue' },
];

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/**
 * Climbs marked Done or with a stored PB.
 * @param {object} bucketState
 * @param {object[]} climbs
 * @param {object[]} [activities]
 */
export function buildBucketListExportRows(bucketState, climbs, activities = []) {
    const climbStatus = bucketState?.climbStatus || {};
    const climbPbs = bucketState?.climbPbs || {};
    const climbById = new Map((climbs || []).map((c) => [String(c.id), c]));
    const actById = new Map((activities || []).map((a) => [String(a.id), a]));

    const exportIds = new Set();
    for (const [id, status] of Object.entries(climbStatus)) {
        if (status === 'done') exportIds.add(String(id));
    }
    for (const id of Object.keys(climbPbs)) {
        if (formatPbSummary(climbPbs[id])) exportIds.add(String(id));
    }

    const rows = [];
    for (const id of exportIds) {
        const climb = climbById.get(id);
        if (!climb) continue;
        const pb = climbPbs[id] ?? climbPbs[climb.id];
        const activity = pb?.activityId ? actById.get(String(pb.activityId)) : null;
        const pbVenue = pb ? resolvePbVenue(pb, climb, activity) : null;

        rows.push({
            climbId: id,
            name: climb.name || '',
            country: climb.country || '',
            status: climbStatus[id] || '',
            lengthKm: climb.lengthKm ?? '',
            elevationM: climb.elevation ?? '',
            avgGradePct: climb.avgGrade ?? '',
            pbSummary: pb ? formatPbSummary(pb) || '' : '',
            pbNormPowerW: pb?.normPower ?? '',
            pbAvgPowerW: pb?.avgPower ?? '',
            pbMovingTimeSec: pb?.movingTimeSec ?? '',
            pbActivityTitle: pb?.activityTitle || activity?.title || '',
            pbActivityId: pb?.activityId ?? '',
            pbMatchSource: pb?.matchSource ?? '',
            pbVenue: pbVenue ? formatPbVenueLabel(pbVenue) : '',
        });
    }

    rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return rows;
}

/**
 * @param {ReturnType<typeof buildBucketListExportRows>} rows
 */
export function bucketListExportToCsv(rows) {
    if (!rows?.length) return '';
    const header = EXPORT_COLUMNS.map((c) => c.label);
    const body = rows.map((row) =>
        EXPORT_COLUMNS.map((col) => row[col.key] ?? ''),
    );
    return [header, ...body].map((line) => line.map(csvEscape).join(',')).join('\r\n');
}

/**
 * @param {object} bucketState
 * @param {ReturnType<typeof buildBucketListExportRows>} rows
 */
export function bucketListExportToJson(bucketState, rows) {
    const climbStatus = {};
    const climbPbs = {};
    for (const row of rows || []) {
        const id = String(row.climbId);
        if (bucketState?.climbStatus?.[id]) climbStatus[id] = bucketState.climbStatus[id];
        if (bucketState?.climbPbs?.[id]) climbPbs[id] = bucketState.climbPbs[id];
    }
    return JSON.stringify({
        schema: BUCKET_LIST_EXPORT_SCHEMA,
        exportedAt: new Date().toISOString(),
        rowCount: rows.length,
        rows,
        climbStatus,
        climbPbs,
        updatedAt: bucketState?.updatedAt ?? null,
        pbScanCompletedAt: bucketState?.pbScanCompletedAt ?? null,
    }, null, 2);
}

function exportFilename(ext) {
    return `bucket-list-done-pb-${new Date().toISOString().slice(0, 10)}.${ext}`;
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
 * @returns {number} rows exported
 */
export function downloadBucketListDonePbCsv(bucketState, climbs, activities) {
    const rows = buildBucketListExportRows(bucketState, climbs, activities);
    if (!rows.length) return 0;
    const blob = new Blob([UTF8_BOM + bucketListExportToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, exportFilename('csv'));
    return rows.length;
}

/**
 * @returns {number} rows exported
 */
export function downloadBucketListDonePbJson(bucketState, climbs, activities) {
    const rows = buildBucketListExportRows(bucketState, climbs, activities);
    if (!rows.length) return 0;
    const json = bucketListExportToJson(
        { climbStatus: bucketState?.climbStatus, climbPbs: bucketState?.climbPbs, updatedAt: bucketState?.updatedAt, pbScanCompletedAt: bucketState?.pbScanCompletedAt },
        rows,
    );
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, exportFilename('json'));
    return rows.length;
}
