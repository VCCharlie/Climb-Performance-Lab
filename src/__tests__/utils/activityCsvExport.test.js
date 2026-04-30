import { describe, it, expect } from 'vitest';
import { activitiesToCsv } from '../../utils/activityCsvExport';

describe('activitiesToCsv', () => {
    it('omits columns marked omitFromExport', () => {
        const csv = activitiesToCsv([
            { date: '2026-01-01', type: 'Ride', title: 'Test', matched_climb: 'should-not-appear' },
        ]);
        const header = csv.split('\r\n')[0];
        expect(header).toContain('title');
        expect(header).not.toContain('matched_climb');
        expect(csv).not.toContain('should-not-appear');
    });
});
