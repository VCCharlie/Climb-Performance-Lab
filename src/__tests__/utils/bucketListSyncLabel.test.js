import { describe, it, expect } from 'vitest';
import { formatBucketListSyncLabel } from '../../utils/bucketListSyncLabel';

describe('formatBucketListSyncLabel', () => {
    it('prompts sign-in when not signed in', () => {
        expect(formatBucketListSyncLabel({ isSignedIn: false })).toContain('sign in');
    });

    it('shows default signed-in hint without timestamps', () => {
        expect(formatBucketListSyncLabel({ isSignedIn: true })).toContain('syncs to cloud');
    });

    it('formats last PB scan and last saved dates', () => {
        const label = formatBucketListSyncLabel({
            isSignedIn: true,
            pbScanCompletedAt: '2026-07-20T12:00:00.000Z',
            updatedAt: '2026-07-21T08:30:00.000Z',
        });
        expect(label).toContain('Last PB scan');
        expect(label).toContain('Last saved');
        expect(label).toContain('20-07-2026');
        expect(label).toContain('21-07-2026');
    });
});
