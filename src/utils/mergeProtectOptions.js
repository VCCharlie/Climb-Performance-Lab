/**
 * Shared opts for protectEnrichedFieldsOnMerge across DataHub sync paths.
 */
import { resolveDeviceProfileTitlesFromSettings } from './bikeComputerProfileTitles.js';
import { resolveSyncDataSourcePrefs } from './syncDataSourcePrefs.js';

/**
 * @param {{ bikeComputerProfileTitles?: string[], syncDataSourcePrefs?: Record<string, unknown> } | null | undefined} userSettings
 * @returns {{ deviceProfileTitles: string[], dataSourcePrefs: import('./syncDataSourcePrefs.js').SyncDataSourcePrefs }}
 */
export function buildMergeProtectOpts(userSettings) {
    return {
        deviceProfileTitles: resolveDeviceProfileTitlesFromSettings(userSettings),
        dataSourcePrefs: resolveSyncDataSourcePrefs(userSettings),
    };
}
