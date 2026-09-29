import { describe, it, expect } from 'vitest';
import {
    stampActivityOwnerId,
    isActivityVisibleToUser,
    activityNeedsOwnerBackfill,
    ownerUidFromSettingsDocId,
} from '../../utils/activityOwnership.js';

describe('activityOwnership', () => {
    it('ownerUidFromSettingsDocId parses user_ prefix', () => {
        expect(ownerUidFromSettingsDocId('user_abc123')).toBe('abc123');
        expect(ownerUidFromSettingsDocId('user_prefs')).toBeNull();
    });

    it('stampActivityOwnerId sets owner on new payload', () => {
        const out = stampActivityOwnerId({ id: '1', type: 'Ride' }, 'uid-1', null);
        expect(out.ownerId).toBe('uid-1');
    });

    it('stampActivityOwnerId preserves existing foreign owner', () => {
        const out = stampActivityOwnerId(
            { id: '1', climbing: 100 },
            'uid-a',
            { ownerId: 'uid-b' },
        );
        expect(out.ownerId).toBe('uid-b');
    });

    it('isActivityVisibleToUser hides other owners', () => {
        expect(isActivityVisibleToUser({ ownerId: 'a' }, 'a')).toBe(true);
        expect(isActivityVisibleToUser({ ownerId: 'a' }, 'b')).toBe(false);
        expect(isActivityVisibleToUser({ id: '1' }, 'a')).toBe(true);
    });

    it('activityNeedsOwnerBackfill detects legacy rows', () => {
        expect(activityNeedsOwnerBackfill({ id: '1' }, 'uid')).toBe(true);
        expect(activityNeedsOwnerBackfill({ id: '1', ownerId: 'uid' }, 'uid')).toBe(false);
    });
});
