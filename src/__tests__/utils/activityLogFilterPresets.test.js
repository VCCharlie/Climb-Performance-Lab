import { describe, it, expect } from 'vitest';
import {
    chipStateForPreset,
    detectActiveLogFilterPreset,
    parseStoredFilterPresetId,
    defaultLogFilterChipState,
} from '../../utils/activityLogFilterPresets';

describe('activityLogFilterPresets', () => {
    it('chipStateForPreset gravel enables gravel chip only', () => {
        const chips = chipStateForPreset('gravel');
        expect(chips.gravelRideChip).toBe(true);
        expect(chips.mtbRideChip).toBe(false);
        expect(chips.ebikeRideChip).toBe(false);
    });

    it('detectActiveLogFilterPreset matches ebike preset', () => {
        const state = { ...defaultLogFilterChipState(), ebikeRideChip: true };
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
