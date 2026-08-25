import { describe, it, expect } from 'vitest';
import {
    computePowerProfileCategoryBars,
    inferRiderArchetype,
    POWER_PROFILE_CATEGORIES,
    RIDER_ARCHETYPE_LABELS,
} from '../../utils/powerProfileCategories';

describe('powerProfileCategories', () => {
    const periodRows = [
        { key: 'best_1min', label: '1 min', watts: 400 },
        { key: 'best_5min', label: '5 min', watts: 320 },
        { key: 'best_20min', label: '20 min', watts: 280 },
        { key: 'best_60min', label: '60 min', watts: 250 },
    ];

    const historyRows = [
        { key: 'best_1min', label: '1 min', watts: 500 },
        { key: 'best_5min', label: '5 min', watts: 350 },
        { key: 'best_20min', label: '20 min', watts: 300 },
        { key: 'best_60min', label: '60 min', watts: 270 },
    ];

    it('exports four category definitions', () => {
        expect(POWER_PROFILE_CATEGORIES.length).toBe(4);
        expect(POWER_PROFILE_CATEGORIES.map((c) => c.id)).toEqual([
            'sprint', 'attack', 'breakaway', 'endurance',
        ]);
    });

    it('scores period peaks vs history baseline', () => {
        const bars = computePowerProfileCategoryBars(periodRows, historyRows);
        expect(bars[0]).toMatchObject({
            id: 'sprint',
            periodWatts: 400,
            baselineWatts: 500,
            pctOfBaseline: 80,
        });
        expect(bars[3].pctOfBaseline).toBeCloseTo(92.6, 1);
    });

    it('falls back to period watts when history missing', () => {
        const bars = computePowerProfileCategoryBars(periodRows, null);
        expect(bars[0].baselineWatts).toBe(400);
        expect(bars[0].pctOfBaseline).toBe(100);
    });

    describe('inferRiderArchetype (re-export)', () => {
        it('returns building when fewer than two peaks exist', () => {
            const result = inferRiderArchetype([{ key: 'best_1min', watts: 400 }], { ftp: 280 });
            expect(result.id).toBe('building');
            expect(result.label).toBe(RIDER_ARCHETYPE_LABELS.building);
        });

        it('delegates to riderPhenotype scoring', () => {
            const rows = [
                { key: 'best_1min', watts: 1100 },
                { key: 'best_5min', watts: 620 },
                { key: 'best_10min', watts: 460 },
                { key: 'best_20min', watts: 340 },
                { key: 'best_60min', watts: 300 },
            ];
            expect(inferRiderArchetype(rows, { ftp: 280 }).id).toBe('sprinter');
        });
    });
});
