/**
 * Merge persisted userSettings with defaults (backward-compatible nested keys).
 */
import { mergeVolumeGoals, hydrateYearlyGoalsFromLegacy } from './volumeGoals.js';
import { getDefaultHistoricalFtpSettings } from './historicalFtp.js';
import { getDefaultUserSettings } from './sessionData.js';
import { mergePhysicsSettings } from './physicsConstants.js';
import { mergeCoachThresholds, mergeRecoveryThresholds } from './coachThresholds.js';

/**
 * @param {Record<string, unknown> | null | undefined} parsed
 * @returns {ReturnType<typeof getDefaultUserSettings>}
 */
export function mergeUserSettingsWithDefaults(parsed) {
    const defaults = getDefaultUserSettings();

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return defaults;
    }

    return {
        ...defaults,
        ...parsed,
        volumeGoals: mergeVolumeGoals(parsed.volumeGoals),
        goals: hydrateYearlyGoalsFromLegacy(
            { ...defaults.goals, ...(parsed.goals || {}) },
            parsed.volumeGoals,
        ),
        physics: mergePhysicsSettings(parsed.physics),
        coachThresholds: mergeCoachThresholds(parsed.coachThresholds),
        recoveryThresholds: mergeRecoveryThresholds(parsed.recoveryThresholds),
        historicalFtp: {
            ...getDefaultHistoricalFtpSettings(),
            ...(parsed.historicalFtp && typeof parsed.historicalFtp === 'object' ? parsed.historicalFtp : {}),
        },
        defaultSyncRangeDays: Number.isFinite(Number(parsed.defaultSyncRangeDays)) && Number(parsed.defaultSyncRangeDays) > 0
            ? Math.round(Number(parsed.defaultSyncRangeDays))
            : defaults.defaultSyncRangeDays,
        weeklyTssOverrides: parsed.weeklyTssOverrides
            && typeof parsed.weeklyTssOverrides === 'object'
            && !Array.isArray(parsed.weeklyTssOverrides)
            ? { ...parsed.weeklyTssOverrides }
            : defaults.weeklyTssOverrides,
    };
}
