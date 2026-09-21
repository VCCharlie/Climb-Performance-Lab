import { describe, it, expect } from 'vitest';
import {
    chipStateForPreset,
    detectActiveLogFilterPreset,
    parseStoredFilterPresetId,
    defaultLogFilterChipState,
} from '../../utils/activityLogFilterPresets';

describe('activityLogFilterPresets', () => {
    it('chipStateForPreset gravel enables GravelRide type filter only', () => {
        const chips = chipStateForPreset('gravel');
        expect(chips.activeSportTypes).toEqual(['GravelRide']);
    });

    it('detectActiveLogFilterPreset matches ebike preset', () => {
        const state = { ...defaultLogFilterChipState(), activeSportTypes: ['EBikeRide'] };
        expect(detectActiveLogFilterPreset(state)).toBe('ebike');
    });

    it('detectActiveLogFilterPreset matches no_strava_link preset', () => {
        const state = { ...defaultLogFilterChipState(), noStravaLinkOnly: true };
        expect(detectActiveLogFilterPreset(state)).toBe('no_strava_link');
    });

    it('detectActiveLogFilterPreset matches possible_duplicates preset', () => {
        const state = { ...defaultLogFilterChipState(), possibleDuplicatesOnly: true };
        expect(detectActiveLogFilterPreset(state)).toBe('possible_duplicates');
    });

    it('parseStoredFilterPresetId rejects unknown ids', () => {
        expect(parseStoredFilterPresetId()).toBeNull();
    });
});
