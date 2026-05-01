import { describe, it, expect } from 'vitest';
import { activitiesToCsv } from '../../utils/activityCsvExport';

describe('activitiesToCsv', () => {
    it('omits columns marked omitFromExport', () => {
        const csv = activitiesToCsv([
            {
                date: '2026-01-01',
                type: 'Ride',
                title: 'Test',
                strava_kom_summary: { label: 'PR', tooltip: 'x' },
            },
        ]);
        const header = csv.split('\r\n')[0];
        expect(header).toContain('title');
        expect(header).not.toContain('strava_kom_summary');
        expect(csv).not.toContain('PR');
    });
});
