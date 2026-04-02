import { describe, it, expect } from 'vitest';
import {
    buildPowerAnchors,
    interpolatePowerAt,
    powerCurveForWindow,
    filterActivitiesByDaysBeforeEnd,
} from '../../utils/powerDurationTable';

describe('interpolatePowerAt', () => {
    it('interpolates between anchors', () => {
        const a = [
            { sec: 60, w: 400 },
            { sec: 300, w: 300 },
        ];
        const mid = interpolatePowerAt(a, 120);
        expect(mid).toBeGreaterThan(300);
        expect(mid).toBeLessThan(400);
    });
});

describe('powerCurveForWindow', () => {
    it('builds curve from activities', () => {
        const acts = [
            {
                max_power: 800,
                best_1min: 450,
                best_5min: 350,
                best_10min: 320,
                best_20min: 300,
                best_60min: 270,
            },
        ];
        const curve = powerCurveForWindow(acts, 250);
        expect(curve['5m']).toBeGreaterThan(0);
        expect(curve['1u']).toBeGreaterThan(0);
    });
});

describe('filterActivitiesByDaysBeforeEnd', () => {
    it('filters by end date', () => {
        const acts = [
            { date: '2026-06-01', load: 50 },
            { date: '2026-01-01', load: 50 },
        ];
        const f = filterActivitiesByDaysBeforeEnd(acts, 30, new Date('2026-06-15'));
        expect(f.length).toBe(1);
    });
});
