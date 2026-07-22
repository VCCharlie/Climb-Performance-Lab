import { describe, it, expect } from 'vitest';
import {
    getPowerZoneDisplay,
    getIntensityFactorZoneDisplay,
    getHeartRateZoneDisplay,
    activityHeartRateIntensityFactor,
} from '../../utils/activityMetricZoneDisplay.js';

describe('activityMetricZoneDisplay', () => {
    it('colors average power by FTP zone', () => {
        const display = getPowerZoneDisplay(240, 300);
        expect(display.displayValue).toBe('240');
        expect(display.zoneName).toBe('Z3 Tempo');
        expect(display.color).toBe('#22c55e');
    });

    it('colors IF directly from ratio', () => {
        const display = getIntensityFactorZoneDisplay(0.95);
        expect(display.displayValue).toBe('0.95');
        expect(display.zoneName).toBe('Z4 Threshold');
        expect(display.color).toBe('#eab308');
    });

    it('colors heart rate by max HR ratio', () => {
        const display = getHeartRateZoneDisplay(152, 190);
        expect(display.displayValue).toBe('152');
        expect(display.zoneName).toBe('Z3 Tempo');
        expect(activityHeartRateIntensityFactor(152, 190)).toBeCloseTo(0.8);
    });

    it('falls back without profile reference', () => {
        expect(getHeartRateZoneDisplay(150, 0).color).toBe(null);
        expect(getIntensityFactorZoneDisplay(0).hasValue).toBe(false);
    });
});
