import { describe, it, expect } from 'vitest';
import { formatActivityLogSyncLabel } from '../../utils/activityLogSyncLabel';

describe('formatActivityLogSyncLabel', () => {
    it('prompts sign-in when not signed in', () => {
        expect(formatActivityLogSyncLabel({ isSignedIn: false, activityCount: 5 })).toContain('Sign in');
    });

    it('shows cloud sync and Intervals timestamp when signed in', () => {
        const label = formatActivityLogSyncLabel({
            isSignedIn: true,
            firestoreSyncStatus: 'synced',
            activityCount: 120,
            lastActivityDate: '2026-07-20',
            lastCloudSyncAt: '2026-07-21T10:00:00.000Z',
            lastIntervalsSyncAt: '2026-07-19T08:00:00.000Z',
        });
        expect(label).toContain('synced to cloud');
        expect(label).toContain('120');
        expect(label).toContain('last Intervals import');
    });
});
