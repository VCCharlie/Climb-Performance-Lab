import { describe, it, expect } from 'vitest';
import {
    buildBucketListExportRows,
    bucketListExportToCsv,
    bucketListExportToJson,
} from '../../utils/bucketListExport';

describe('bucketListExport', () => {
    const climbs = [
        { id: 'fr_alpe', name: 'Alpe d\'Huez', country: 'FR', lengthKm: 13.8, elevation: 1100, avgGrade: 8.1 },
        { id: 'it_stelvio', name: 'Stelvio', country: 'IT', lengthKm: 20, elevation: 1500, avgGrade: 7.5 },
    ];

    it('includes done climbs and climbs with PB', () => {
        const state = {
            climbStatus: { fr_alpe: 'done', it_stelvio: 'planned' },
            climbPbs: {
                it_stelvio: { normPower: 240, movingTimeSec: 3600, matchSource: 'title' },
            },
        };
        const rows = buildBucketListExportRows(state, climbs);
        expect(rows.length).toBe(2);
        expect(rows.find((r) => r.climbId === 'fr_alpe')?.status).toBe('done');
        expect(rows.find((r) => r.climbId === 'it_stelvio')?.pbNormPowerW).toBe(240);
    });

    it('csv and json contain export data', () => {
        const state = {
            climbStatus: { fr_alpe: 'done' },
            climbPbs: {},
            updatedAt: '2026-07-01T00:00:00.000Z',
        };
        const rows = buildBucketListExportRows(state, climbs);
        expect(bucketListExportToCsv(rows)).toContain('Alpe');
        const json = JSON.parse(bucketListExportToJson(state, rows));
        expect(json.rowCount).toBe(1);
        expect(json.climbStatus.fr_alpe).toBe('done');
    });
});
