import { describe, it, expect } from 'vitest';
import { hasLocalIntervalsCredentials } from '../../services/intervalsCloudApi.js';

describe('hasLocalIntervalsCredentials', () => {
    it('requires athlete id and api key', () => {
        expect(hasLocalIntervalsCredentials({ athleteId: 'i1', apiKey: 'k' })).toBe(true);
        expect(hasLocalIntervalsCredentials({ athleteId: 'i1', apiKey: '' })).toBe(false);
        expect(hasLocalIntervalsCredentials({ athleteId: '', apiKey: 'k' })).toBe(false);
        expect(hasLocalIntervalsCredentials(null)).toBe(false);
    });
});
