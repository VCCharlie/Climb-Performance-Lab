import { describe, it, expect, vi } from 'vitest';
import {
    buildGearFilterOptionsFromActivities,
    mergeActiveGearFilterOption,
} from '../../utils/activityGearFilterOptions';

vi.mock('../../utils/stravaBikesLocalMap', () => ({
    resolveStravaGearDisplay: (gid, rawName) => ({
        display: rawName || gid,
    }),
}));

describe('buildGearFilterOptionsFromActivities', () => {
    it('returns unique sorted bikes from activities with gear_id', () => {
        const activities = [
            { gear_id: 'b2', gear_name: 'Gravel' },
            { gear_id: 'b1', gear_name: 'Road' },
            { gear_id: 'b2', gear_name: 'Gravel' },
            { gear_name: 'No id' },
        ];
        expect(buildGearFilterOptionsFromActivities(activities)).toEqual([
            { id: 'b2', label: 'Gravel' },
            { id: 'b1', label: 'Road' },
        ]);
    });

    it('returns empty array for empty input', () => {
        expect(buildGearFilterOptionsFromActivities([])).toEqual([]);
        expect(buildGearFilterOptionsFromActivities(null)).toEqual([]);
    });
});

describe('mergeActiveGearFilterOption', () => {
    it('appends active id when missing from options', () => {
        const merged = mergeActiveGearFilterOption([{ id: 'a', label: 'A' }], 'b', 'Old bike');
        expect(merged).toEqual([
            { id: 'a', label: 'A' },
            { id: 'b', label: 'Old bike' },
        ]);
    });

    it('does not duplicate when active id is already listed', () => {
        const opts = [{ id: 'a', label: 'A' }];
        expect(mergeActiveGearFilterOption(opts, 'a')).toBe(opts);
    });
});
