import { describe, it, expect } from 'vitest';
import {
    TOP_TEN_POWER_DURATIONS,
    PEAK_BAR_POWER_DURATIONS,
    STORED_BEST_POWER_DURATIONS,
    topTenInterpolatedOpts,
    topTenDurationFootnote,
} from '../../utils/powerDurationStandard';

describe('powerDurationStandard', () => {
    it('includes 30 sec, 150 min, and 180 min in Top 10 durations', () => {
        const secs = TOP_TEN_POWER_DURATIONS.map((d) => d.sec);
        expect(secs).toContain(30);
        expect(secs).toContain(9000);
        expect(secs).toContain(10800);
    });

    it('requires long-duration anchors for 120+ min Top 10 tables', () => {
        expect(topTenInterpolatedOpts({ sec: 3600, label: '60 min' })).toEqual({});
        expect(topTenInterpolatedOpts({ sec: 7200, label: '120 min', minAnchorSec: 7200 }))
            .toEqual({ requireAnchorBeyondSec: 7200 });
        expect(topTenInterpolatedOpts({ sec: 10800, label: '180 min', minAnchorSec: 10800 }))
            .toEqual({ requireAnchorBeyondSec: 10800 });
    });

    it('adds footnotes for long Top 10 durations only', () => {
        expect(topTenDurationFootnote({ sec: 30, label: '30 sec' })).toBeNull();
        expect(topTenDurationFootnote({ sec: 9000, label: '150 min', minAnchorSec: 9000 }))
            .toMatch(/150 min/);
    });

    it('keeps peak bar and stored field durations aligned on shared seconds', () => {
        const storedSecs = new Set(STORED_BEST_POWER_DURATIONS.map((d) => d.sec));
        for (const bar of PEAK_BAR_POWER_DURATIONS) {
            if (bar.sec >= 60) {
                expect(storedSecs.has(bar.sec)).toBe(true);
            }
        }
    });

    it('includes 30s in peak bar picker', () => {
        expect(PEAK_BAR_POWER_DURATIONS.some((d) => d.sec === 30 && d.label === '30s')).toBe(true);
    });
});
