import { describe, it, expect } from 'vitest';
import { formatNightlySyncLine, resolveNightlySyncStatus } from '../../utils/nightlySyncStatus';

describe('nightlySyncStatus', () => {
    it('formats sync line with counts', () => {
        const line = formatNightlySyncLine({
            at: '2026-08-28T06:00:00.000Z',
            activitiesSaved: 12,
        });
        expect(line).toContain('Last nightly sync:');
        expect(line).toContain('12 activities synced');
    });

    it('returns null when no timestamp', () => {
        expect(formatNightlySyncLine(null)).toBeNull();
    });

    it('prefers cloud status over missing cloud', () => {
        const cloud = { at: '2026-08-28T06:00:00.000Z' };
        expect(resolveNightlySyncStatus(cloud)?.at).toBe(cloud.at);
    });
});
