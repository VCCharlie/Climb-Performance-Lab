import { describe, it, expect, vi } from 'vitest';
import {
    GENERAL_METRIC_PRESETS,
    DRIFT_METRIC_PRESETS,
    applyPresetBounds,
    presetBoundsToFilterState,
    createPresetApplier,
    presetsConflict,
    getConflictingPresetIds,
    mergeBoundsIntoFilterState,
    mergePresetsToFilterState,
    toggleMetricPresetIds,
    createEmptyMetricFilterState,
} from '../../utils/metricRangePresets';
import { activityMatchesDriftRange } from '../../utils/activityFilterMetrics';

function createMockHandlers() {
    return {
        onFilterDistMinChange: vi.fn(),
        onFilterDistMaxChange: vi.fn(),
        onFilterSpeedMinChange: vi.fn(),
        onFilterSpeedMaxChange: vi.fn(),
        onFilterPowerMinChange: vi.fn(),
        onFilterPowerMaxChange: vi.fn(),
        onFilterDurMinMinChange: vi.fn(),
        onFilterDurMaxMinChange: vi.fn(),
        onFilterElevMinChange: vi.fn(),
        onFilterElevMaxChange: vi.fn(),
        onFilterKjMinChange: vi.fn(),
        onFilterKjMaxChange: vi.fn(),
        onFilterDecMinChange: vi.fn(),
        onFilterDecMaxChange: vi.fn(),
        onFilterThrMinChange: vi.fn(),
        onFilterThrMaxChange: vi.fn(),
        onFilterRaceMinChange: vi.fn(),
        onFilterRaceMaxChange: vi.fn(),
    };
}

describe('metricRangePresets', () => {
    it('maps general preset bounds to filter state', () => {
        const longRide = GENERAL_METRIC_PRESETS.find((p) => p.label === 'Long ≥4h');
        expect(longRide).toBeDefined();
        expect(presetBoundsToFilterState(longRide.bounds)).toMatchObject({
            filterDurMinMin: '240',
            filterDistMin: '',
        });
    });

    it('maps drift preset bounds to filter state', () => {
        expect(presetBoundsToFilterState({ decMax: '5' })).toMatchObject({
            filterDecMax: '5',
            filterDecMin: '',
        });
        expect(presetBoundsToFilterState({ decMin: '0' })).toMatchObject({
            filterDecMin: '0',
            filterDecMax: '',
        });
        expect(presetBoundsToFilterState({ thrMax: '5' })).toMatchObject({ filterThrMax: '5' });
        expect(presetBoundsToFilterState({ thrMin: '0' })).toMatchObject({ filterThrMin: '0' });
        expect(presetBoundsToFilterState({ raceMax: '10' })).toMatchObject({ filterRaceMax: '10' });
        expect(presetBoundsToFilterState({ raceMin: '0' })).toMatchObject({ filterRaceMin: '0' });
    });

    it('applies preset bounds through handlers', () => {
        const preset = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Dec >10% (high)');
        const handlers = createMockHandlers();

        applyPresetBounds(preset.bounds, handlers);

        expect(handlers.onFilterDecMinChange).toHaveBeenCalledWith('10');
        expect(handlers.onFilterDecMaxChange).not.toHaveBeenCalled();
    });

    it('createPresetApplier wraps applyPresetBounds', () => {
        const preset = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Race ≤10%');
        const handlers = createMockHandlers();

        createPresetApplier(preset)(handlers);

        expect(handlers.onFilterRaceMaxChange).toHaveBeenCalledWith('10');
    });

    it('defines all seven drift presets with expected labels', () => {
        expect(DRIFT_METRIC_PRESETS.map((p) => p.label)).toEqual([
            'Dec ≤5% (good)',
            'Dec analyzed',
            'Dec >10% (high)',
            'Thr ≤5% (good)',
            'Thr analyzed',
            'Race ≤10%',
            'Race analyzed',
        ]);
    });

    describe('preset merge and toggle', () => {
        it('merges non-conflicting general presets across different metrics', () => {
            const merged = mergePresetsToFilterState(['long-4h', 'dist-min-50']);

            expect(merged).toMatchObject({
                filterDurMinMin: '240',
                filterDistMin: '50',
            });
        });

        it('merges compatible drift min and max on the same column', () => {
            const merged = mergePresetsToFilterState(['dec-analyzed', 'dec-max-5']);

            expect(merged).toMatchObject({
                filterDecMin: '0',
                filterDecMax: '5',
            });
        });

        it('merges general preset with drift preset', () => {
            const merged = mergePresetsToFilterState(['long-4h', 'dec-max-5']);

            expect(merged).toMatchObject({
                filterDurMinMin: '240',
                filterDecMax: '5',
            });
        });

        it('detects opposing duration presets as conflicting', () => {
            const shortPreset = GENERAL_METRIC_PRESETS.find((p) => p.id === 'short-1h');
            const longPreset = GENERAL_METRIC_PRESETS.find((p) => p.id === 'long-4h');

            expect(presetsConflict(shortPreset, longPreset)).toBe(true);
        });

        it('detects same drift min key presets as conflicting', () => {
            const analyzed = DRIFT_METRIC_PRESETS.find((p) => p.id === 'dec-analyzed');
            const high = DRIFT_METRIC_PRESETS.find((p) => p.id === 'dec-min-10');

            expect(presetsConflict(analyzed, high)).toBe(true);
        });

        it('does not treat drift min + max on same column as conflicting', () => {
            const analyzed = DRIFT_METRIC_PRESETS.find((p) => p.id === 'dec-analyzed');
            const good = DRIFT_METRIC_PRESETS.find((p) => p.id === 'dec-max-5');

            expect(presetsConflict(analyzed, good)).toBe(false);
        });

        it('toggle off removes a preset from the active set', () => {
            expect(toggleMetricPresetIds(['long-4h', 'dec-max-5'], 'long-4h')).toEqual(['dec-max-5']);
        });

        it('activating a preset replaces conflicting active presets on the same axis', () => {
            const next = toggleMetricPresetIds(['short-1h'], 'long-4h');

            expect(next).toEqual(['long-4h']);
        });

        it('recomputes empty filter state when all presets are toggled off', () => {
            const empty = mergePresetsToFilterState([]);
            expect(empty).toEqual(createEmptyMetricFilterState());
        });

        it('tightens duplicate min bounds to the higher minimum', () => {
            const state = createEmptyMetricFilterState();
            const merged = mergeBoundsIntoFilterState(state, { distMin: '30' });
            const tightened = mergeBoundsIntoFilterState(merged, { distMin: '50' });

            expect(tightened.filterDistMin).toBe('50');
        });

        it('returns conflicting ids for an activating preset', () => {
            const longPreset = GENERAL_METRIC_PRESETS.find((p) => p.id === 'long-4h');
            const conflicts = getConflictingPresetIds(longPreset, ['short-1h', 'dist-min-50']);

            expect(conflicts).toEqual(['short-1h']);
        });
    });

    describe('drift preset filter semantics', () => {
        it('Dec ≤5% (good) matches low decoupling and excludes missing values', () => {
            const { bounds } = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Dec ≤5% (good)');
            const state = presetBoundsToFilterState(bounds);
            const max = Number(state.filterDecMax);

            expect(activityMatchesDriftRange({ decoupling_pct: 4.2 }, 'decoupling_pct', null, max)).toBe(true);
            expect(activityMatchesDriftRange({ decoupling_pct: 8 }, 'decoupling_pct', null, max)).toBe(false);
            expect(activityMatchesDriftRange({}, 'decoupling_pct', null, max)).toBe(false);
        });

        it('Dec analyzed requires finite drift (min 0 means >= 0)', () => {
            const { bounds } = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Dec analyzed');
            const state = presetBoundsToFilterState(bounds);
            const min = Number(state.filterDecMin);

            expect(activityMatchesDriftRange({ decoupling_pct: 0 }, 'decoupling_pct', min, null)).toBe(true);
            expect(activityMatchesDriftRange({ decoupling_pct: 12 }, 'decoupling_pct', min, null)).toBe(true);
            expect(activityMatchesDriftRange({}, 'decoupling_pct', min, null)).toBe(false);
        });

        it('Thr analyzed requires finite threshold drift', () => {
            const { bounds } = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Thr analyzed');
            const state = presetBoundsToFilterState(bounds);
            const min = Number(state.filterThrMin);

            expect(activityMatchesDriftRange({ threshold_drift_pct: 3.5 }, 'threshold_drift_pct', min, null)).toBe(true);
            expect(activityMatchesDriftRange({ threshold_drift_pct: null }, 'threshold_drift_pct', min, null)).toBe(false);
        });

        it('Race ≤10% caps race drift pct', () => {
            const { bounds } = DRIFT_METRIC_PRESETS.find((p) => p.label === 'Race ≤10%');
            const state = presetBoundsToFilterState(bounds);
            const max = Number(state.filterRaceMax);

            expect(activityMatchesDriftRange({ race_drift_pct: 9.5 }, 'race_drift_pct', null, max)).toBe(true);
            expect(activityMatchesDriftRange({ race_drift_pct: 11 }, 'race_drift_pct', null, max)).toBe(false);
        });
    });
});
