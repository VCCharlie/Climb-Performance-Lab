import { describe, it, expect } from 'vitest';
import XLSX from 'xlsx';
import {
    activitiesToCsv,
    activitiesToExportRows,
    activitiesToXlsxWorksheet,
    formatActivityExportCell,
    getActivityExportColumns,
} from '../../utils/activityCsvExport';

describe('getActivityExportColumns', () => {
    it('omits columns marked omitFromExport', () => {
        const keys = getActivityExportColumns().map((c) => c.key);
        expect(keys).toContain('title');
        expect(keys).not.toContain('strava_kom_summary');
        expect(keys).not.toContain('intensity_factor');
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
});

describe('activitiesToXlsxWorksheet', () => {
    it('writes data rows directly under header columns', () => {
        const ws = activitiesToXlsxWorksheet(
            [{ date: '2026-07-11', type: 'Ride', title: 'CD', distance: 42.5, load: 65 }],
            XLSX,
        );
        expect(ws.A1?.v).toBe('Date');
        expect(ws.C1?.v).toBe('Title');
        expect(ws.A2?.v).toBe('2026-07-11');
        expect(ws.B2?.v).toBe('Ride');
        expect(ws.C2?.v).toBe('CD');
    });
});
