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

    describe('inferRiderArchetype', () => {
        it('returns building when fewer than two peaks exist', () => {
            const result = inferRiderArchetype([{ key: 'best_1min', watts: 400 }]);
            expect(result.id).toBe('building');
            expect(result.label).toBe(RIDER_ARCHETYPE_LABELS.building);
        });

        it('detects sprinter profile from high 1 min vs 5 min ratio', () => {
            const rows = [
                { key: 'best_1min', watts: 900 },
                { key: 'best_5min', watts: 650 },
                { key: 'best_20min', watts: 420 },
                { key: 'best_60min', watts: 360 },
            ];
            expect(inferRiderArchetype(rows).id).toBe('sprinter');
        });

        it('detects puncheur profile from strong 5 min efforts', () => {
            const rows = [
                { key: 'best_1min', watts: 500 },
                { key: 'best_5min', watts: 430 },
                { key: 'best_20min', watts: 340 },
                { key: 'best_60min', watts: 310 },
            ];
            expect(inferRiderArchetype(rows).id).toBe('puncheur');
        });

        it('detects diesel profile from dominant 60 min peak', () => {
            const rows = [
                { key: 'best_1min', watts: 370 },
                { key: 'best_5min', watts: 345 },
                { key: 'best_20min', watts: 335 },
                { key: 'best_60min', watts: 333 },
            ];
            expect(inferRiderArchetype(rows).id).toBe('diesel');
        });

        it('detects time trialist from flat 20–60 min curve', () => {
            const rows = [
                { key: 'best_1min', watts: 430 },
                { key: 'best_5min', watts: 410 },
                { key: 'best_20min', watts: 395 },
                { key: 'best_60min', watts: 385 },
            ];
            expect(inferRiderArchetype(rows).id).toBe('time_trialist');
        });

        it('detects climber from sustained mid-long power without punch', () => {
            const rows = [
                { key: 'best_1min', watts: 410 },
                { key: 'best_5min', watts: 400 },
                { key: 'best_20min', watts: 375 },
                { key: 'best_60min', watts: 355 },
            ];
            expect(inferRiderArchetype(rows).id).toBe('climber');
        });
    });
});
