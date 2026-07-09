import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    isQuotaExceededError,
    pruneLocalStorageCaches,
    safeLocalStorageSet,
    maintainBrowserStorageOnBoot,
} from '../../utils/safeStorage.js';

describe('safeStorage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('isQuotaExceededError detects DOMException code 22', () => {
        const err = new DOMException('quota', 'QuotaExceededError');
        expect(isQuotaExceededError(err)).toBe(true);
    });

    it('pruneLocalStorageCaches removes expired intervals_data_* keys', () => {
        const stale = JSON.stringify({ timestamp: Date.now() - 2 * 60 * 60 * 1000, data: [] });
        localStorage.setItem('intervals_data_2024-01-01_2024-12-31', stale);
        localStorage.setItem('theme', 'dark');

        const removed = pruneLocalStorageCaches({ aggressive: false });
        expect(removed).toBe(1);
        expect(localStorage.getItem('intervals_data_2024-01-01_2024-12-31')).toBeNull();
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('safeLocalStorageSet prunes and retries on quota error', () => {
        localStorage.setItem('stravaVsLogScan_v1_99', 'x'.repeat(4 * 1024 * 1024));
        const setItem = Storage.prototype.setItem;
        let calls = 0;
        Storage.prototype.setItem = function patchedSetItem(key, value) {
            calls += 1;
            if (calls === 1 && key === 'dashboard_timeRange') {
                const e = new DOMException('quota', 'QuotaExceededError');
                throw e;
            }
            return setItem.call(this, key, value);
        };

        try {
            const ok = safeLocalStorageSet('dashboard_timeRange', '1Y');
            expect(ok).toBe(true);
            expect(localStorage.getItem('dashboard_timeRange')).toBe('1Y');
            expect(localStorage.getItem('stravaVsLogScan_v1_99')).toBeNull();
        } finally {
            Storage.prototype.setItem = setItem;
        }
    });

    it('maintainBrowserStorageOnBoot does not throw', () => {
        expect(() => maintainBrowserStorageOnBoot()).not.toThrow();
    });
});
