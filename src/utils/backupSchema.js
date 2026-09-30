/**
 * Backup export/import validation for Settings JSON files.
 */

export const BACKUP_MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_BACKUP_TOP_KEYS = new Set([
    'activities',
    'settings',
    'intervals',
    'bucketList',
    'strava',
    'stravaProfile',
    'theme',
    'accentPalette',
    'racePacing',
    'gearOptimizer',
    'climbProfiler',
    'weatherClimb',
    'fueling',
    'activityLogFilter',
    'coachWeekState',
    'trainingPlanSnapshot',
    'activityLogColumns',
    'intervalsSyncHealth',
    'duplicateResolutions',
    '_security_notice',
]);

export const BACKUP_SECURITY_NOTICE =
    'This file may contain API keys and OAuth tokens in plain text. Store it securely; do not share publicly.';

const IMPORT_LABELS = {
    activities: 'Activities',
    settings: 'User settings (weight, FTP, goals, …)',
    intervals: 'Intervals.icu configuration',
    bucketList: 'Bucket list climbs',
    strava: 'Strava connection',
    stravaProfile: 'Strava profile cache',
    theme: 'Theme (light/dark)',
    accentPalette: 'Accent color palette',
    racePacing: 'Race pacing planner',
    gearOptimizer: 'Gear optimizer tab',
    climbProfiler: 'Climb profiler tab',
    weatherClimb: 'Weather climb tab',
    fueling: 'Race fueling tab',
    activityLogFilter: 'Activity log filters',
    coachWeekState: 'Coach week plan (completions & overrides)',
    trainingPlanSnapshot: 'Training goal / event planner',
    activityLogColumns: 'Activity log column visibility',
    intervalsSyncHealth: 'Last Intervals sync summary',
    duplicateResolutions: 'Duplicate pair resolutions',
};

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function buildBackupExport(payload) {
    return {
        ...payload,
        _security_notice: BACKUP_SECURITY_NOTICE,
    };
}

/**
 * @param {unknown} data
 * @returns {{ ok: true, keys: string[] } | { ok: false, error: string }}
 */
export function validateBackupPayload(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'Backup must be a JSON object.' };
    }

    const allKeys = Object.keys(data);
    const disallowed = allKeys.filter((key) => !ALLOWED_BACKUP_TOP_KEYS.has(key));
    if (disallowed.length > 0) {
        return { ok: false, error: `Unknown backup keys: ${disallowed.join(', ')}` };
    }

    const restorable = allKeys.filter((key) => key !== '_security_notice');
    if (restorable.length === 0) {
        return { ok: false, error: 'Backup file contains no restorable data.' };
    }

    return { ok: true, keys: restorable };
}

/**
 * Human-readable list of sections that will be restored.
 * @param {Record<string, unknown>} data
 * @returns {string[]}
 */
export function describeBackupImport(data) {
    if (!data || typeof data !== 'object') return [];
    return Object.keys(data)
        .filter((key) => key !== '_security_notice' && data[key] != null)
        .map((key) => IMPORT_LABELS[key] || key);
}
