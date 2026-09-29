/**
 * Per-field source-of-truth when Intervals re-sync merges with Strava-enriched rows.
 * Manual climbing edits always win regardless of these prefs.
 */

/** @typedef {'strava' | 'intervals'} FieldDataSource */

/** @typedef {{ elevation: FieldDataSource, title: FieldDataSource, gearAndType: FieldDataSource }} SyncDataSourcePrefs */

export const DEFAULT_SYNC_DATA_SOURCE_PREFS = {
    /** Climbing meters (elevation gain). */
    elevation: 'strava',
    /** Activity title when Strava-linked. */
    title: 'strava',
    /** Gear id/name and sport type when Strava-linked. */
    gearAndType: 'strava',
};

/**
 * @param {unknown} value
 * @returns {FieldDataSource}
 */
export function normalizeFieldDataSource(value) {
    return value === 'intervals' ? 'intervals' : 'strava';
}

/**
 * @param {Record<string, unknown> | null | undefined} partial
 * @returns {SyncDataSourcePrefs}
 */
export function mergeSyncDataSourcePrefs(partial) {
    const base = DEFAULT_SYNC_DATA_SOURCE_PREFS;
    const src = partial && typeof partial === 'object' && !Array.isArray(partial) ? partial : {};
    return {
        elevation: normalizeFieldDataSource(src.elevation ?? base.elevation),
        title: normalizeFieldDataSource(src.title ?? base.title),
        gearAndType: normalizeFieldDataSource(src.gearAndType ?? base.gearAndType),
    };
}

/**
 * @param {{ syncDataSourcePrefs?: Record<string, unknown> } | null | undefined} userSettings
 * @returns {SyncDataSourcePrefs}
 */
export function resolveSyncDataSourcePrefs(userSettings) {
    return mergeSyncDataSourcePrefs(userSettings?.syncDataSourcePrefs);
}

/**
 * @param {SyncDataSourcePrefs} prefs
 * @returns {string}
 */
export function formatSyncDataSourcePrefsSummary(prefs) {
    const p = mergeSyncDataSourcePrefs(prefs);
    const label = (v) => (v === 'intervals' ? 'Intervals' : 'Strava');
    return `elevation ${label(p.elevation)}, title ${label(p.title)}, gear/type ${label(p.gearAndType)}`;
}
