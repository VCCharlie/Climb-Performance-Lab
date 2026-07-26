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

    it('parseStoredFilterPresetId rejects unknown ids', () => {
        expect(parseStoredFilterPresetId()).toBeNull();
    });
});
