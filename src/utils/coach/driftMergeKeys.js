/** Field groups persisted per drift profile (order: steady → threshold → race). */
export const DRIFT_PATCH_KEY_GROUPS = [
    [
        'decoupling_pct',
        'decoupling_ef_first',
        'decoupling_ef_second',
        'decoupling_status',
        'decoupling_source',
        'decoupling_analyzed_at',
    ],
    [
        'threshold_drift_pct',
        'threshold_drift_ef_first',
        'threshold_drift_ef_second',
        'threshold_drift_status',
        'threshold_drift_source',
        'threshold_drift_analyzed_at',
    ],
    [
        'race_drift_pct',
        'race_drift_ef_first',
        'race_drift_ef_second',
        'race_drift_status',
        'race_drift_source',
        'race_drift_analyzed_at',
    ],
];

export function getAllDriftMergeKeys() {
    return DRIFT_PATCH_KEY_GROUPS.flat();
}
