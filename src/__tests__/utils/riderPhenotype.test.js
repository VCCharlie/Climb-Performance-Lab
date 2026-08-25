import { describe, it, expect } from 'vitest';
import {
    inferRiderPhenotype,
    RIDER_PHENOTYPE_LABELS,
    PHENOTYPE_DURATION_KEYS,
    PHENOTYPE_BANDS,
} from '../../utils/riderPhenotype';

function peakRows(profile) {
    const labels = {
        best_1min: '1 min',
        best_5min: '5 min',
        best_10min: '10 min',
        best_20min: '20 min',
        best_60min: '60 min',
    };
    return PHENOTYPE_DURATION_KEYS.map((key) => ({
        key,
        label: labels[key],
        watts: profile[key] ?? 0,
    }));
}

describe('riderPhenotype', () => {
    const FTP = 280;

    it('exports band documentation for UI', () => {
        expect(PHENOTYPE_BANDS).toHaveLength(4);
        expect(PHENOTYPE_BANDS.map((b) => b.id)).toEqual([
            'sprinter',
            'climber',
            'time_trialist',
            'rouleur',
        ]);
    });

    it('returns building when fewer than two peaks exist', () => {
        const result = inferRiderPhenotype([{ key: 'best_1min', watts: 400 }], { ftp: FTP });
        expect(result.id).toBe('building');
        expect(result.label).toBe(RIDER_PHENOTYPE_LABELS.building);
        expect(result.confidence).toBe(0);
    });

    it('detects sprinter-shaped curve (short durations 2+ zones above 20 min)', () => {
        const rows = peakRows({
            best_1min: 1100,
            best_5min: 620,
            best_10min: 460,
            best_20min: 340,
            best_60min: 300,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP });
        expect(result.id).toBe('sprinter');
        expect(result.scores.sprinter).toBeGreaterThan(result.scores.rouleur);
    });

    it('detects rouleur-shaped flat curve', () => {
        const rows = peakRows({
            best_1min: 318,
            best_5min: 312,
            best_10min: 308,
            best_20min: 304,
            best_60min: 300,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP });
        expect(result.id).toBe('rouleur');
        expect(result.scores.rouleur).toBeGreaterThan(result.scores.sprinter);
    });

    it('detects climber-shaped mid-duration peak with w/kg', () => {
        const rows = peakRows({
            best_1min: 390,
            best_5min: 410,
            best_10min: 405,
            best_20min: 398,
            best_60min: 355,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP, weightKg: 68 });
        expect(result.id).toBe('climber');
        expect(result.scores.climber).toBeGreaterThan(result.scores.sprinter);
    });

    it('detects realistic amateur climber — not time trialist on moderate drop-off', () => {
        const rows = peakRows({
            best_1min: 420,
            best_5min: 330,
            best_10min: 305,
            best_20min: 285,
            best_60min: 255,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP, weightKg: 72 });
        expect(result.id).toBe('climber');
        expect(result.scores.time_trialist).toBeLessThan(result.scores.climber);
    });

    it('detects time-trialist-shaped sustained 20–60 min curve', () => {
        const rows = peakRows({
            best_1min: 360,
            best_5min: 345,
            best_10min: 332,
            best_20min: 320,
            best_60min: 306,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP });
        expect(result.id).toBe('time_trialist');
        expect(result.scores.time_trialist).toBeGreaterThan(result.scores.sprinter);
    });

    it('does not label a typical amateur curve as sprinter (old 1min/5min bug)', () => {
        const rows = peakRows({
            best_1min: 400,
            best_5min: 320,
            best_10min: 295,
            best_20min: 280,
            best_60min: 250,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP });
        expect(result.id).not.toBe('sprinter');
    });

    it('does not default to time trialist on flat-moderate amateur curves', () => {
        const rows = peakRows({
            best_1min: 380,
            best_5min: 350,
            best_10min: 335,
            best_20min: 320,
            best_60min: 300,
        });
        const result = inferRiderPhenotype(rows, { ftp: FTP, weightKg: 72 });
        expect(result.id).not.toBe('time_trialist');
    });

    it('uses period peaks — different periods can yield different phenotypes', () => {
        const sprinterPeriod = peakRows({
            best_1min: 1050,
            best_5min: 600,
            best_10min: 430,
            best_20min: 330,
            best_60min: 290,
        });
        const ttPeriod = peakRows({
            best_1min: 360,
            best_5min: 345,
            best_10min: 332,
            best_20min: 318,
            best_60min: 305,
        });
        expect(inferRiderPhenotype(sprinterPeriod, { ftp: FTP }).id).toBe('sprinter');
        expect(inferRiderPhenotype(ttPeriod, { ftp: FTP }).id).toBe('time_trialist');
    });

    it('estimates FTP from 20 min when not provided', () => {
        const rows = peakRows({
            best_1min: 360,
            best_5min: 345,
            best_10min: 332,
            best_20min: 320,
            best_60min: 306,
        });
        const result = inferRiderPhenotype(rows);
        expect(result.id).toBe('time_trialist');
        expect(result.zoneIndices.best_20min).toBeGreaterThan(0);
    });
});
