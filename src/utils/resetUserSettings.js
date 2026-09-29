/**
 * Reset user settings to factory defaults while preserving secrets and integrations.
 */
import { getDefaultUserSettings } from './sessionData.js';

/** Keys preserved when resetting settings to defaults. */
export const PRESERVED_SETTINGS_KEYS = [
    'openweatherApiKey',
    'geminiApiKey',
    'syncGeminiKeyToCloud',
    'githubPat',
];

/**
 * Human-readable list of what reset keeps vs clears (for confirm dialog).
 */
export const RESET_SETTINGS_PRESERVED_LABELS = [
    'OpenWeatherMap API key',
    'Gemini API key',
    'Gemini cloud sync preference',
    'GitHub PAT (nightly sync trigger)',
];

export const RESET_SETTINGS_CLEARED_LABELS = [
    'Profile (weight, FTP, bike weight, birth year)',
    'Goals and volume targets',
    'Physics defaults (CdA, CRR, drivetrain loss)',
    'Coach & recovery thresholds',
    'Default Intervals sync range, sync depth (Fast/Full), enrich limits, and data source prefs',
    'Notification thresholds',
    'Power zones, terrain profile, quick links',
    'Historical FTP overrides',
];

/**
 * @param {Record<string, unknown>} [current]
 * @returns {ReturnType<typeof getDefaultUserSettings>}
 */
export function resetUserSettingsPreservingSecrets(current = {}) {
    const defaults = getDefaultUserSettings();
    const preserved = {};

    for (const key of PRESERVED_SETTINGS_KEYS) {
        if (current[key] != null && current[key] !== '') {
            preserved[key] = current[key];
        }
    }

    return {
        ...defaults,
        ...preserved,
    };
}
