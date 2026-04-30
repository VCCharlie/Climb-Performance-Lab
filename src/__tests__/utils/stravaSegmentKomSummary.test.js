import { describe, it, expect } from 'vitest';
import { buildStravaKomSummaryFromSegmentEfforts } from '../../utils/stravaSegmentKomSummary';

describe('buildStravaKomSummaryFromSegmentEfforts', () => {
    it('returns null when no PR or top-10 KOM', () => {
        expect(buildStravaKomSummaryFromSegmentEfforts([{ name: 'Flat', pr_rank: 5, kom_rank: 50 }])).toBeNull();
    });

    it('summarizes PR and KOM rank', () => {
        const s = buildStravaKomSummaryFromSegmentEfforts([
            { name: 'Alp d Huez', pr_rank: 1, kom_rank: 3 },
        ]);
        expect(s.label).toContain('PR');
        expect(s.label).toContain('KOM#3');
        expect(s.tooltip).toContain('Alp d Huez');
    });

    it('treats kom_rank 1 as KOM', () => {
        const s = buildStravaKomSummaryFromSegmentEfforts([
            { name: 'Local climb', kom_rank: 1 },
        ]);
        expect(s.label).toContain('KOM');
        expect(s.label).not.toContain('KOM#1');
    });
});
