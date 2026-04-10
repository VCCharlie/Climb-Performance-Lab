import { describe, it, expect } from 'vitest';
import {
    interpolatePowerAt,
    powerCurveForWindow,
    powerCurveWithSources,
    filterActivitiesByDaysBeforeEnd,
    computeTopPowerMoments,
    topNInterpolatedAtSec,
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
                id: 'x1',
                date: '2026-01-01',
                title: 'Test',
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

describe('powerCurveWithSources', () => {
    it('attributes peak to an activity', () => {
        const acts = [
            {
                id: 'a',
                date: '2026-01-01',
                title: 'Weak',
                max_power: 100,
                best_1min: 200,
                best_5min: 180,
                best_10min: 170,
                best_20min: 160,
                best_60min: 150,
            },
            {
                id: 'b',
                date: '2026-01-02',
                title: 'Strong',
                max_power: 900,
                best_1min: 400,
                best_5min: 350,
                best_10min: 320,
                best_20min: 300,
                best_60min: 270,
            },
        ];
        const src = powerCurveWithSources(acts, 250);
        expect(src['5m'].activity.id).toBe('b');
        expect(src['5m'].watts).toBeGreaterThan(300);
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

describe('topNInterpolatedAtSec', () => {
    it('returns top N at fixed duration', () => {
        const acts = [
            {
                id: 'a',
                date: '2026-01-01',
                max_power: 100,
                best_1min: 200,
                best_5min: 180,
                best_10min: 170,
                best_20min: 160,
                best_60min: 150,
            },
            {
                id: 'b',
                date: '2026-01-02',
                max_power: 900,
                best_1min: 400,
                best_5min: 350,
                best_10min: 320,
                best_20min: 300,
                best_60min: 270,
            },
        ];
        const top = topNInterpolatedAtSec(acts, 250, 300, 2);
        expect(top.length).toBe(2);
        expect(top[0].activity.id).toBe('b');
        expect(top[0].watts).toBeGreaterThan(top[1].watts);
    });

    it('minMovingTimeSec excludes short rides at long target duration', () => {
        const short = {
            id: 'short',
            date: '2026-01-01',
            moving_time: 3600,
            max_power: 500,
            best_1min: 300,
            best_5min: 280,
            best_10min: 270,
            best_20min: 260,
            best_60min: 250,
        };
        const long = { ...short, id: 'long', moving_time: 8000 };
        const top = topNInterpolatedAtSec([short, long], 250, 7200, 10, { minMovingTimeSec: 7200 });
        expect(top.every((r) => r.activity.id === 'long')).toBe(true);
    });
});

describe('computeTopPowerMoments', () => {
    it('returns highest interpolated moments first', () => {
        const acts = [
            {
                id: 'a',
                date: '2026-01-01',
                title: 'Weak',
                max_power: 100,
                best_1min: 200,
                best_5min: 180,
                best_10min: 170,
                best_20min: 160,
                best_60min: 150,
            },
            {
                id: 'b',
                date: '2026-01-02',
                title: 'Strong',
                max_power: 900,
                best_1min: 400,
                best_5min: 350,
                best_10min: 320,
                best_20min: 300,
                best_60min: 270,
            },
        ];
        const top = computeTopPowerMoments(acts, 250, 3);
        expect(top.length).toBe(3);
        expect(top[0].watts).toBeGreaterThanOrEqual(top[1].watts);
        expect(top[0].activity.id).toBe('b');
    });
});
