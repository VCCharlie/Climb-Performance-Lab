import { describe, it, expect, beforeEach } from 'vitest';
import {
    enhanceActivity,
    enhanceAndSortActivities,
    clearEnhanceActivityCache,
} from '../../utils/enhanceActivity';

describe('enhanceActivity cache', () => {
    beforeEach(() => {
        clearEnhanceActivityCache();
    });

    it('derives eFTP and sea-level power', () => {
        const raw = {
            id: '1',
            date: '2026-01-01',
            best_20min: 200,
            best_60min: 190,
            avg_power: 180,
            avg_altitude: 1500,
        };
        const enriched = enhanceActivity(raw, 250);
        expect(enriched.eFTP).toBe(190);
        expect(enriched.eFTP60).toBe(190);
        expect(enriched.ftp).toBe(250);
        expect(enriched.seaLevelPower).toBeGreaterThan(180);
    });

    it('returns cached object for identical inputs', () => {
        const raw = { id: '2', date: '2026-02-01', best_20min: 210 };
        const a = enhanceActivity(raw, 240);
        const b = enhanceActivity({ ...raw }, 240);
        expect(a).toBe(b);
    });

    it('recomputes when power fields change', () => {
        const base = { id: '3', date: '2026-03-01', best_20min: 200 };
        const first = enhanceActivity(base, 250);
        const second = enhanceActivity({ ...base, best_20min: 220 }, 250);
        expect(first).not.toBe(second);
        expect(second.eFTP).toBe(209);
    });

    it('sorts enhanceAndSortActivities by ISO date', () => {
        const list = enhanceAndSortActivities([
            { id: 'b', date: '2026-02-01' },
            { id: 'a', date: '2026-01-01' },
        ], 250);
        expect(list.map((a) => a.id)).toEqual(['a', 'b']);
    });
});
