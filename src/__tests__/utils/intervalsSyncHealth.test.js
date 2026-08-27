import { describe, it, expect } from 'vitest';
import { formatIntervalsSyncHealthLine } from '../../utils/intervalsSyncHealth';

describe('intervalsSyncHealth', () => {
    it('formats sync health line with counts', () => {
        const line = formatIntervalsSyncHealthLine(
            { at: '2026-08-27T10:00:00.000Z', added: 3, updated: 2, skipped: 1 },
            null,
        );
        expect(line).toContain('Last sync 2026-08-27');
        expect(line).toContain('3 new');
        expect(line).toContain('2 updated');
        expect(line).toContain('1 skipped');
    });

    it('returns null when no sync metadata exists', () => {
        expect(formatIntervalsSyncHealthLine(null, null)).toBeNull();
    });
});
