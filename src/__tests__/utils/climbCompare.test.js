import { describe, it, expect } from 'vitest';
import { buildClimbComparisonMetrics, buildClimbComparisonRows } from '../../utils/climbCompare';

const alpe = {
    id: 'alpe',
    name: 'Alpe d\'Huez',
    country: 'FR',
    lengthKm: 13.8,
    elevation: 1120,
    avgGrade: 8.1,
    cat: 'HC',
};

const montVentoux = {
    id: 'ventoux',
    name: 'Mont Ventoux',
    country: 'FR',
    lengthKm: 21.5,
    elevation: 1610,
    avgGrade: 7.5,
    cat: 'HC',
};

const userSettings = { weight: 70, bikeWeight: 8, ftp: 280 };

describe('climbCompare', () => {
    it('builds physics metrics for a climb', () => {
        const m = buildClimbComparisonMetrics(alpe, userSettings);
        expect(m.physicsWatts).toBeGreaterThan(200);
        expect(m.physicsSeconds).toBeGreaterThan(0);
        expect(m.estimatedTss).toBeGreaterThan(0);
    });

    it('returns comparison rows for two climbs', () => {
        const rows = buildClimbComparisonRows(alpe, montVentoux, userSettings);
        expect(rows.length).toBeGreaterThan(5);
        const lengthRow = rows.find((r) => r.key === 'lengthKm');
        expect(lengthRow?.a).toContain('13.8');
        expect(lengthRow?.b).toContain('21.5');
    });
});
