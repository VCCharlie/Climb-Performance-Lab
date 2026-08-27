import { describe, it, expect, beforeEach } from 'vitest';
import {
    ACTIVITY_LOG_FILTER_STATE_KEY,
    buildActivityLogFilterSnapshot,
    mergeActivityLogFilterDefaults,
    readActivityLogFilterState,
    writeActivityLogFilterState,
} from '../../utils/activityLogFilterPersistence';

describe('activityLogFilterPersistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('builds and restores filter snapshots', () => {
        const snapshot = buildActivityLogFilterSnapshot({
            search: 'alpe',
            indoorFilter: 'outdoor',
            filterPowerMin: '200',
            activeMetricPresetIds: ['long'],
        });

        writeActivityLogFilterState(snapshot);
        expect(readActivityLogFilterState()).toEqual(snapshot);
        expect(localStorage.getItem(ACTIVITY_LOG_FILTER_STATE_KEY)).toBeTruthy();
    });

    it('merges saved values onto defaults', () => {
        const merged = mergeActivityLogFilterDefaults(
            { search: 'cols', filterGearId: 'b123' },
            { search: '', filterGearId: '', indoorFilter: 'all' },
        );
        expect(merged.search).toBe('cols');
        expect(merged.filterGearId).toBe('b123');
        expect(merged.indoorFilter).toBe('all');
    });
});
