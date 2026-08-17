import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY, readLastIntervalsSyncAt } from '../../utils/activityLogSyncLabel';
import { useDataHubIntervalsSync } from '../../hooks/useDataHubIntervalsSync';

const hookPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../hooks/useDataHubIntervalsSync.js',
);

/**
 * Regression guard: Phase 2 dropped the activityLogSyncLabel import while still
 * calling readLastIntervalsSyncAt() — build passed but the app crashed at runtime.
 */
describe('useDataHubIntervalsSync import guard', () => {
    it('exports the hook and sync-label helpers used at init', () => {
        expect(typeof useDataHubIntervalsSync).toBe('function');
        expect(typeof readLastIntervalsSyncAt).toBe('function');
        expect(typeof ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY).toBe('string');
        expect(ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY.length).toBeGreaterThan(0);
    });

    it('imports readLastIntervalsSyncAt from activityLogSyncLabel in source', () => {
        const source = readFileSync(hookPath, 'utf8');
        expect(source).toMatch(
            /import\s*\{[^}]*readLastIntervalsSyncAt[^}]*\}\s*from\s*['"]\.\.\/utils\/activityLogSyncLabel['"]/,
        );
        expect(source).toMatch(
            /import\s*\{[^}]*ACTIVITY_LOG_INTERVALS_LAST_SYNC_KEY[^}]*\}\s*from\s*['"]\.\.\/utils\/activityLogSyncLabel['"]/,
        );
    });
});
