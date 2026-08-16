/**
 * Tests for src/utils/intervalsPowerCurveEnrich.js
 */
import { describe, it, expect } from 'vitest';
import { lookupPowerCurveWattsAtDuration } from '../../utils/intervalsPowerCurveEnrich';

describe('lookupPowerCurveWattsAtDuration', () => {
    it('returns exact match from secs/watts arrays', () => {
        const curve = {
            secs: [60, 300, 3600, 5400, 7200],
            watts: [400, 320, 240, 210, 200],
        };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(210);
        expect(lookupPowerCurveWattsAtDuration(curve, 3600)).toBe(240);
    });

    it('interpolates between known durations', () => {
        const curve = {
            secs: [3600, 7200],
            watts: [240, 200],
        };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(220);
    });

    it('returns 0 for empty or invalid input', () => {
        expect(lookupPowerCurveWattsAtDuration(null, 5400)).toBe(0);
        expect(lookupPowerCurveWattsAtDuration({ secs: [], watts: [] }, 5400)).toBe(0);
    });

    it('supports values array alias', () => {
        const curve = { secs: [5400], values: [215] };
        expect(lookupPowerCurveWattsAtDuration(curve, 5400)).toBe(215);
    });
});
