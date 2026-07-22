import { describe, it, expect } from 'vitest';
import { getCogganZoneForIntensityFactor } from '../../utils/cogganZoneForIntensity.js';

describe('getCogganZoneForIntensityFactor', () => {
    it('maps typical IF values to Coggan zones', () => {
        expect(getCogganZoneForIntensityFactor(0.5)?.name).toBe('Z1 Recovery');
        expect(getCogganZoneForIntensityFactor(0.7)?.name).toBe('Z2 Endurance');
        expect(getCogganZoneForIntensityFactor(0.85)?.name).toBe('Z3 Tempo');
        expect(getCogganZoneForIntensityFactor(0.95)?.name).toBe('Z4 Threshold');
        expect(getCogganZoneForIntensityFactor(1.1)?.name).toBe('Z5 VO2 Max');
    });

    it('returns null for invalid input', () => {
        expect(getCogganZoneForIntensityFactor(0)).toBe(null);
        expect(getCogganZoneForIntensityFactor(null)).toBe(null);
    });

    it('does not fall back to Z1 in boundary gaps (e.g. 105–106% FTP)', () => {
        expect(getCogganZoneForIntensityFactor(306 / 289)?.name).toBe('Z5 VO2 Max');
        expect(getCogganZoneForIntensityFactor(1.058)?.name).toBe('Z5 VO2 Max');
        expect(getCogganZoneForIntensityFactor(0.555)?.name).toBe('Z2 Endurance');
    });
});
