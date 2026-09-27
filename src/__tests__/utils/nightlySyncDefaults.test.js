import { describe, it, expect } from 'vitest';
import { SPORT_TYPES } from '../../config';
import {
    getDefaultNightlyAllowedSportTypes,
    buildNightlyIntervalsConfig,
    NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES,
    defaultSportFilterMap,
} from '../../utils/nightlySyncDefaults.js';

describe('nightlySyncDefaults', () => {
    it('includes all DataHub config sport types plus trainer aliases', () => {
        const types = getDefaultNightlyAllowedSportTypes();
        for (const t of SPORT_TYPES) {
            expect(types).toContain(t);
        }
        for (const t of NIGHTLY_EXTRA_INTERVALS_SPORT_TYPES) {
            expect(types).toContain(t);
        }
    });

    it('buildNightlyIntervalsConfig returns null without credentials', () => {
        expect(buildNightlyIntervalsConfig({})).toBeNull();
        expect(buildNightlyIntervalsConfig({ athleteId: 'i1', apiKey: 'k' })).toEqual({
            athleteId: 'i1',
            apiKey: 'k',
        });
    });
});
