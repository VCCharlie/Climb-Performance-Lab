/**
 * Read/write local-only state included in Settings JSON backup.
 */

import { safeLocalStorageSet } from './safeStorage.js';
import {
    ACTIVITY_COLUMN_STORAGE_KEY,
    parseStoredColumnKeys,
} from './activityColumnVisibility.js';
import { readIntervalsSyncHealthSummary } from './intervalsSyncHealth.js';
import { readTrainingPlanSnapshotRaw, applyTrainingPlanToLocal } from './trainingPlanSnapshot.js';
import {
    readCoachWeekStorageForBackup,
    mergeCoachWeekStorageFromBackup,
} from './coach/coachWeekState.js';
import {
    readDuplicateResolutionsForBackup,
    mergeDuplicateResolutionsFromBackup,
} from './duplicateResolutions.js';
import { writeIntervalsSyncHealthSummary } from './intervalsSyncHealth.js';

/**
 * Collect optional local state for backup export.
 * @returns {Record<string, unknown>}
 */
export function readBackupLocalExtras() {
    /** @type {Record<string, unknown>} */
    const extras = {};

    const coachWeek = readCoachWeekStorageForBackup();
    if (coachWeek?.weeks && Object.keys(coachWeek.weeks).length > 0) {
        extras.coachWeekState = coachWeek;
    } else if (coachWeek?.week2Enabled) {
        extras.coachWeekState = coachWeek;
    }

    const trainingPlan = readTrainingPlanSnapshotRaw();
    if (trainingPlan) {
        extras.trainingPlanSnapshot = trainingPlan;
    }

    if (typeof localStorage !== 'undefined') {
        try {
            const rawCols = localStorage.getItem(ACTIVITY_COLUMN_STORAGE_KEY);
            const keys = parseStoredColumnKeys(rawCols);
            if (keys) {
                extras.activityLogColumns = keys;
            }
        } catch {
            /* ignore */
        }
    }

    const syncHealth = readIntervalsSyncHealthSummary();
    if (syncHealth) {
        extras.intervalsSyncHealth = syncHealth;
    }

    const dupStore = readDuplicateResolutionsForBackup();
    const hasDup =
        Object.keys(dupStore.byPairKey).length > 0
        || Object.keys(dupStore.byFingerprint).length > 0;
    if (hasDup) {
        extras.duplicateResolutions = dupStore;
    }

    return extras;
}

/**
 * Restore optional local state from a validated backup payload.
 * @param {Record<string, unknown>} backupData
 */
export function applyBackupLocalExtras(backupData) {
    if (!backupData || typeof backupData !== 'object') return;

    if (backupData.coachWeekState) {
        mergeCoachWeekStorageFromBackup(backupData.coachWeekState);
    }

    if (backupData.trainingPlanSnapshot) {
        applyTrainingPlanToLocal(backupData.trainingPlanSnapshot);
    }

    if (Array.isArray(backupData.activityLogColumns) && backupData.activityLogColumns.length > 0) {
        safeLocalStorageSet(
            ACTIVITY_COLUMN_STORAGE_KEY,
            JSON.stringify(backupData.activityLogColumns),
        );
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cpl-activity-columns-restored'));
        }
    }

    if (backupData.intervalsSyncHealth && typeof backupData.intervalsSyncHealth === 'object') {
        writeIntervalsSyncHealthSummary(backupData.intervalsSyncHealth);
    }

    if (backupData.duplicateResolutions) {
        mergeDuplicateResolutionsFromBackup(backupData.duplicateResolutions);
    }
}
