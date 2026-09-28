import { describe, it, expect } from 'vitest';
import { CYCLING_SPORT_TYPES, SPORT_TYPES } from '../../config';
import {
    getDefaultNightlyAllowedSportTypes,
    buildNightlyIntervalsConfig,
    NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES,
    defaultSportFilterMap,
} from '../../utils/nightlySyncDefaults.js';

describe('nightlySyncDefaults', () => {
    it('includes cycling sport types plus trainer aliases (no Run/Walk/Hike)', () => {
        const types = getDefaultNightlyAllowedSportTypes();
        for (const t of CYCLING_SPORT_TYPES) {
            expect(types).toContain(t);
        }
        for (const t of NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES) {
            expect(types).toContain(t);
        }
        expect(types).not.toContain('Run');
        expect(types).not.toContain('Walk');
        expect(types).not.toContain('Hike');
    });

    it('defaultSportFilterMap enables cycling types only', () => {
        const map = defaultSportFilterMap();
        for (const t of CYCLING_SPORT_TYPES) {
            expect(map[t]).toBe(true);
        }
        expect(map.Run).toBe(false);
        expect(map.Walk).toBe(false);
        expect(map.Hike).toBe(false);
        expect(Object.keys(map).sort()).toEqual([...SPORT_TYPES].sort());
    });

    it('buildNightlyIntervalsConfig returns null without credentials', () => {
        expect(buildNightlyIntervalsConfig({})).toBeNull();
        expect(buildNightlyIntervalsConfig({ athleteId: 'i1', apiKey: 'k' })).toEqual({
            athleteId: 'i1',
            apiKey: 'k',
        });
    });
});
