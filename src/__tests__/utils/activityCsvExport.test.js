import { describe, it, expect } from 'vitest';
import XLSX from 'xlsx';
import {
    activitiesToCsv,
    activitiesToExportRows,
    activitiesToXlsxWorksheet,
    exportDistanceKm,
    formatActivityExportCell,
    getActivityExportColumns,
    parseExportNumber,
} from '../../utils/activityCsvExport';

describe('getActivityExportColumns', () => {
    it('omits columns marked omitFromExport', () => {
        const keys = getActivityExportColumns().map((c) => c.key);
        expect(keys).toContain('title');
        expect(keys).not.toContain('strava_kom_summary');
        expect(keys).not.toContain('intensity_factor');
    });

    it('includes Strava link column at the end', () => {
        const columns = getActivityExportColumns();
        expect(columns[columns.length - 1]).toEqual({ key: 'strava_url', label: 'Strava link' });
    });
});

describe('activitiesToCsv', () => {
    it('uses human-readable column labels in the header', () => {
        const csv = activitiesToCsv([
            {
                date: '2026-01-01',
                type: 'Ride',
                title: 'Test',
                strava_kom_summary: { label: 'PR', tooltip: 'x' },
            },
        ]);
        const header = csv.split('\r\n')[0];
        expect(header).toContain('Title');
        expect(header).not.toContain('strava_kom_summary');
        expect(csv).not.toContain('PR');
    });

    it('escapes commas in cell values', () => {
        const csv = activitiesToCsv([{ date: '2026-01-01', type: 'Ride', title: 'Ride, long' }]);
        expect(csv).toContain('"Ride, long"');
    });

    it('exports formatted time and distance for mixed activity shapes', () => {
        const csv = activitiesToCsv([
            {
                date: '2026-07-11T07:28:57.000Z',
                type: 'Ride',
                title: 'Intervals ride',
                moving_time: 7903,
                distance: 72.83,
                strava_id: '987654321',
            },
            {
                date: '2026-04-01',
                type: 'Ride',
                title: 'Legacy CSV ride',
                moving_time: '2:20:59',
                distance: '73.43',
            },
        ]);
        expect(csv).toContain('2026-07-11');
        expect(csv).not.toContain('T07:28:57');
        expect(csv).toContain('2:11:43');
        expect(csv).toContain('2:20:59');
        expect(csv).toContain('72,83');
        expect(csv).toContain('73,43');
        expect(csv).toContain('https://www.strava.com/activities/987654321');
        expect(csv).not.toContain(',7903,');
    });
});

describe('activitiesToExportRows', () => {
    it('returns header row plus one data row per activity', () => {
        const rows = activitiesToExportRows([
            { date: '2026-01-01', type: 'Ride', title: 'A' },
            { date: '2026-01-02', type: 'Run', title: 'B' },
        ]);
        expect(rows).toHaveLength(3);
        expect(rows[0][0]).toBe('Date');
        expect(rows[1]).toContain('A');
        expect(rows[2]).toContain('B');
    });
});

describe('formatActivityExportCell', () => {
    it('returns empty string for objects', () => {
        expect(formatActivityExportCell({ label: 'PR' }, 'strava_kom_summary')).toBe('');
    });

    it('formats moving_time from seconds to H:MM:SS', () => {
        expect(formatActivityExportCell(8459, 'moving_time')).toBe('2:20:59');
    });

    it('keeps moving_time that is already H:MM:SS', () => {
        expect(formatActivityExportCell('2:20:59', 'moving_time')).toBe('2:20:59');
    });

    it('formats distance with Dutch comma decimal', () => {
        expect(formatActivityExportCell(72.83, 'distance')).toBe('72,83');
        expect(formatActivityExportCell('73.43', 'distance')).toBe('73,43');
        expect(formatActivityExportCell('72,83', 'distance')).toBe('72,83');
    });

    it('formats integer metrics with Dutch locale', () => {
        expect(formatActivityExportCell(245, 'norm_power')).toBe('245');
        expect(formatActivityExportCell('120', 'load')).toBe('120');
    });

    it('normalizes date values to YYYY-MM-DD for export', () => {
        expect(formatActivityExportCell('2017-05-04', 'date')).toBe('2017-05-04');
        expect(formatActivityExportCell('2026-09-20T07:26:49.000Z', 'date')).toBe('2026-09-20');
    });

    it('passes through Strava activity URLs', () => {
        expect(formatActivityExportCell('https://www.strava.com/activities/123456', 'strava_url'))
            .toBe('https://www.strava.com/activities/123456');
        expect(formatActivityExportCell(null, 'strava_url')).toBe('');
    });
});

describe('parseExportNumber', () => {
    it('accepts comma and period decimals', () => {
        expect(parseExportNumber('72,83')).toBe(72.83);
        expect(parseExportNumber('73.43')).toBe(73.43);
        expect(parseExportNumber(80.84)).toBe(80.84);
    });
});

describe('exportDistanceKm', () => {
    it('converts legacy meter values above 2000', () => {
        expect(exportDistanceKm(72830)).toBeCloseTo(72.83, 2);
    });
});

describe('activitiesToXlsxWorksheet', () => {
    it('writes data rows directly under header columns', () => {
        const ws = activitiesToXlsxWorksheet(
            [{
                date: '2026-07-11T07:28:57.000Z',
                type: 'Ride',
                title: 'CD',
                distance: 42.5,
                load: 65,
                strava_id: '123456',
            }],
            XLSX,
        );
        expect(ws.A1?.v).toBe('Date');
        expect(ws.C1?.v).toBe('Title');
        expect(ws.A2?.v).toBe('2026-07-11');
        expect(ws.B2?.v).toBe('Ride');
        expect(ws.C2?.v).toBe('CD');
    });

    it('includes Strava link column when strava_id is present', () => {
        const ws = activitiesToXlsxWorksheet(
            [{ date: '2026-01-01', type: 'Ride', title: 'A', strava_id: '555' }],
            XLSX,
        );
        const columns = getActivityExportColumns();
        const stravaColIndex = columns.findIndex((c) => c.key === 'strava_url');
        const colLetter = XLSX.utils.encode_col(stravaColIndex);
        expect(ws[`${colLetter}1`]?.v).toBe('Strava link');
        expect(ws[`${colLetter}2`]?.v).toBe('https://www.strava.com/activities/555');
        expect(ws[`${colLetter}2`]?.l?.Target).toBe('https://www.strava.com/activities/555');
    });

    it('does not add hyperlink when Strava URL is empty', () => {
        const ws = activitiesToXlsxWorksheet(
            [{ date: '2026-01-01', type: 'Ride', title: 'No Strava' }],
            XLSX,
        );
        const stravaColIndex = getActivityExportColumns().findIndex((c) => c.key === 'strava_url');
        const colLetter = XLSX.utils.encode_col(stravaColIndex);
        expect(ws[`${colLetter}2`]?.v).toBe('');
        expect(ws[`${colLetter}2`]?.l).toBeUndefined();
    });
});
