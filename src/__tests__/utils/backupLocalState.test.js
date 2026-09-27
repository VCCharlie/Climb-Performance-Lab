import { describe, it, expect, beforeEach } from 'vitest';
import { readBackupLocalExtras, applyBackupLocalExtras } from '../../utils/backupLocalState.js';
import { TRAINING_PLAN_STORAGE_KEY } from '../../utils/trainingPlanSnapshot.js';
import { ACTIVITY_COLUMN_STORAGE_KEY } from '../../utils/activityColumnVisibility.js';

describe('backupLocalState', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('round-trips training plan and column visibility', () => {
        const plan = {
            version: 2,
            updatedAt: '2026-08-01T12:00:00.000Z',
            goalDate: '2026-10-01',
            weeks: [{ weekNum: 1, targetTss: 300, phaseKey: 'base', phaseLabel: 'Base' }],
        };
        localStorage.setItem(TRAINING_PLAN_STORAGE_KEY, JSON.stringify(plan));
        localStorage.setItem(ACTIVITY_COLUMN_STORAGE_KEY, JSON.stringify(['date', 'distance', 'load']));

        const extras = readBackupLocalExtras();
        expect(extras.trainingPlanSnapshot?.goalDate).toBe('2026-10-01');
        expect(extras.activityLogColumns).toEqual(['date', 'distance', 'load']);

        localStorage.clear();
        applyBackupLocalExtras(extras);
        expect(localStorage.getItem(TRAINING_PLAN_STORAGE_KEY)).toContain('2026-10-01');
        expect(JSON.parse(localStorage.getItem(ACTIVITY_COLUMN_STORAGE_KEY))).toEqual(['date', 'distance', 'load']);
    });
});
