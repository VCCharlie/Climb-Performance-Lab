import { describe, it, expect } from 'vitest';
import { formatIntervalsSyncSummary, countMergeCategories } from '../../utils/importSyncStats';

describe('importSyncStats', () => {
    it('formats sync summary with skips', () => {
        const text = formatIntervalsSyncSummary(
            { fetched: 10, imported: 7, skippedEmpty: 2, skippedSport: 1 },
            { newCount: 3, updatedCount: 4 },
        );
        expect(text).toContain('7 ride(s) imported');
        expect(text).toContain('3 new');
        expect(text).toContain('4 updated');
        expect(text).toContain('2 skipped');
    });

    it('counts new vs updated merges', () => {
        const counts = countMergeCategories(
            [{ id: 'a' }, { id: 'b' }],
            [{ id: 'b' }],
        );
        expect(counts.newCount).toBe(1);
        expect(counts.updatedCount).toBe(1);
    });
});
