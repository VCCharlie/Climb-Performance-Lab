import { describe, it, expect } from 'vitest';
import {
    DEFAULT_COACH_THRESHOLDS,
    DEFAULT_RECOVERY_THRESHOLDS,
    mergeCoachThresholds,
    mergeRecoveryThresholds,
    scaleCoachPeriodThresholds,
} from '../../utils/coachThresholds.js';
import { mergeUserSettingsWithDefaults } from '../../utils/userSettingsMerge.js';
import { getDefaultUserSettings } from '../../utils/sessionData.js';
import {
    resetUserSettingsPreservingSecrets,
    PRESERVED_SETTINGS_KEYS,
} from '../../utils/resetUserSettings.js';
import { buildDefaultSyncDates } from '../../utils/syncDateRange.js';
import { normalizeSyncDepth } from '../../utils/intervalsSyncDepth.js';
import { DEFAULT_SYNC_ENRICH_LIMITS } from '../../utils/syncEnrichLimits.js';
import { DEFAULT_SYNC_DATA_SOURCE_PREFS } from '../../utils/syncDataSourcePrefs.js';

describe('coachThresholds', () => {
    it('merges partial coach thresholds', () => {
        const merged = mergeCoachThresholds({ highWeeklyLoadTss: 350 });
        expect(merged.highWeeklyLoadTss).toBe(350);
        expect(merged.lowWeeklyLoadTss).toBe(DEFAULT_COACH_THRESHOLDS.lowWeeklyLoadTss);
    });

    it('scales period thresholds from 30-day reference', () => {
        const scaled = scaleCoachPeriodThresholds(DEFAULT_COACH_THRESHOLDS, 60);
        expect(scaled.consistencyHigh).toBe(24);
        expect(scaled.intensityLow).toBe(4);
    });
});

describe('userSettingsMerge', () => {
    it('adds new Phase 3 keys without breaking legacy saves', () => {
        const legacy = { weight: 72, ftp: 250 };
        const merged = mergeUserSettingsWithDefaults(legacy);
        expect(merged.weight).toBe(72);
        expect(merged.ftp).toBe(250);
        expect(merged.defaultSyncRangeDays).toBe(14);
        expect(merged.defaultIntervalsSyncDepth).toBe('fast');
        expect(merged.syncEnrichLimits).toEqual(DEFAULT_SYNC_ENRICH_LIMITS);
        expect(merged.syncDataSourcePrefs).toEqual(DEFAULT_SYNC_DATA_SOURCE_PREFS);
        expect(merged.physics.crr).toBe(0.004);
        expect(merged.coachThresholds.highWeeklyLoadTss).toBe(400);
        expect(merged.recoveryThresholds.tsbCritical).toBe(-30);
    });

    it('getDefaultUserSettings includes Phase 3 nested defaults', () => {
        const defaults = getDefaultUserSettings();
        expect(defaults.defaultSyncRangeDays).toBe(14);
        expect(defaults.defaultIntervalsSyncDepth).toBe('fast');
        expect(defaults.recoveryThresholds).toEqual(DEFAULT_RECOVERY_THRESHOLDS);
    });
});

describe('resetUserSettings', () => {
    it('preserves API keys when resetting', () => {
        const current = {
            ...getDefaultUserSettings(),
            weight: 80,
            openweatherApiKey: 'ow-key',
            geminiApiKey: 'gem-key',
            githubPat: 'ghp_test',
        };
        const reset = resetUserSettingsPreservingSecrets(current);
        expect(reset.weight).toBe(70);
        expect(reset.openweatherApiKey).toBe('ow-key');
        expect(reset.geminiApiKey).toBe('gem-key');
        expect(reset.githubPat).toBe('ghp_test');
    });

    it('documents preserved keys', () => {
        expect(PRESERVED_SETTINGS_KEYS).toContain('geminiApiKey');
    });
});

describe('defaultIntervalsSyncDepth merge', () => {
    it('normalizes invalid stored values to fast', () => {
        const merged = mergeUserSettingsWithDefaults({ defaultIntervalsSyncDepth: 'invalid' });
        expect(merged.defaultIntervalsSyncDepth).toBe('fast');
    });

    it('keeps full when set', () => {
        const merged = mergeUserSettingsWithDefaults({ defaultIntervalsSyncDepth: 'full' });
        expect(merged.defaultIntervalsSyncDepth).toBe('full');
        expect(normalizeSyncDepth(merged.defaultIntervalsSyncDepth)).toBe('full');
    });
});

describe('syncDateRange', () => {
    it('buildDefaultSyncDates uses days back', () => {
        const range = buildDefaultSyncDates(7);
        expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const start = new Date(`${range.start}T12:00:00`);
        const end = new Date(`${range.end}T12:00:00`);
        const diffDays = Math.round((end - start) / (86400 * 1000));
        expect(diffDays).toBe(7);
    });
});
