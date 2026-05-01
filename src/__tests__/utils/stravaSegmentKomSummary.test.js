import { describe, it, expect } from 'vitest';
import {
    buildStravaKomSummaryFromSegmentEfforts,
    getKomBadgeCountsFromSummary,
    buildKomBadgeSlotList,
    getKomBadgeDisplaySlots,
} from '../../utils/stravaSegmentKomSummary';

describe('buildStravaKomSummaryFromSegmentEfforts', () => {
    it('returns null when no PR or top-10 KOM', () => {
        expect(buildStravaKomSummaryFromSegmentEfforts([{ name: 'Flat', pr_rank: 5, kom_rank: 50 }])).toBeNull();
    });

    it('counts PR and per-rank leaderboard places in kom_counts', () => {
        const s = buildStravaKomSummaryFromSegmentEfforts([
            { name: 'Alp d Huez', pr_rank: 1, kom_rank: 3 },
        ]);
        expect(s.label).toContain('PR');
        expect(s.label).not.toMatch(/KOM/i);
        expect(s.prCount).toBe(1);
        expect(s.kom_counts[3]).toBe(1);
        expect(s.tooltip).toContain('Alp d Huez');
        expect(s.tooltip).toMatch(/3rd overall/i);
    });

    it('records overall #1 without KOM text in label', () => {
        const s = buildStravaKomSummaryFromSegmentEfforts([
            { name: 'Local climb', kom_rank: 1 },
        ]);
        expect(s.label).not.toMatch(/KOM/i);
        expect(s.kom_counts[1]).toBe(1);
        expect(s.tooltip).toMatch(/1st overall/i);
    });

    it('aggregates multiple same ranks', () => {
        const s = buildStravaKomSummaryFromSegmentEfforts([
            { name: 'A', kom_rank: 2 },
            { name: 'B', kom_rank: 2 },
        ]);
        expect(s.kom_counts[2]).toBe(2);
        expect(s.bestKomRank).toBe(2);
    });
});

describe('getKomBadgeCountsFromSummary', () => {
    it('reads kom_counts when present', () => {
        const kom_counts = Array(11).fill(0);
        kom_counts[1] = 2;
        kom_counts[3] = 1;
        const { king, ranks } = getKomBadgeCountsFromSummary({ kom_counts });
        expect(king).toBe(2);
        expect(ranks).toEqual([{ rank: 3, count: 1 }]);
    });

    it('parses legacy KOM#n from label', () => {
        const { king, ranks } = getKomBadgeCountsFromSummary({
            label: 'PR · KOM#2',
            bestKomRank: 2,
        });
        expect(king).toBe(0);
        expect(ranks).toEqual([{ rank: 2, count: 1 }]);
    });

    it('parses legacy lone KOM as crown', () => {
        const { king, ranks } = getKomBadgeCountsFromSummary({
            label: 'PR · KOM',
            bestKomRank: 1,
        });
        expect(king).toBe(1);
        expect(ranks).toEqual([]);
    });
});

describe('getKomBadgeDisplaySlots', () => {
    it('shows at most 3 segment icons and reports overflow', () => {
        const kom_counts = Array(11).fill(0);
        kom_counts[1] = 2;
        kom_counts[2] = 2;
        const { shown, hiddenCount, totalKom } = getKomBadgeDisplaySlots({ kom_counts }, 3);
        expect(totalKom).toBe(4);
        expect(shown).toHaveLength(3);
        expect(shown.filter((s) => s.kind === 'crown')).toHaveLength(2);
        expect(shown.filter((s) => s.kind === 'trophy')).toHaveLength(1);
        expect(hiddenCount).toBe(1);
    });

    it('buildKomBadgeSlotList interleaves crowns then trophies by rank', () => {
        const slots = buildKomBadgeSlotList(1, [{ rank: 3, count: 2 }]);
        expect(slots).toEqual([
            { kind: 'crown' },
            { kind: 'trophy', rank: 3 },
            { kind: 'trophy', rank: 3 },
        ]);
    });
});
