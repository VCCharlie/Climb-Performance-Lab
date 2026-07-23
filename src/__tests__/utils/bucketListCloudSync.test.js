import { describe, it, expect } from 'vitest';
import {
    bucketListSettingsDocId,
    BUCKET_LIST_CLOUD_DEBOUNCE_MS,
} from '../../utils/bucketListCloudSync';

describe('bucketListCloudSync', () => {
    it('builds settings doc id from uid', () => {
        expect(bucketListSettingsDocId('abc123')).toBe('user_abc123');
    });

    it('exports debounce constant', () => {
        expect(BUCKET_LIST_CLOUD_DEBOUNCE_MS).toBeGreaterThan(0);
    });
});
