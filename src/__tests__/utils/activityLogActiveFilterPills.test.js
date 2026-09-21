import { describe, it, expect, vi } from 'vitest';
import { buildActivityLogActiveFilterPills } from '../../utils/activityLogActiveFilterPills';

describe('buildActivityLogActiveFilterPills', () => {
    it('returns empty array when no filters are active', () => {
        expect(buildActivityLogActiveFilterPills({})).toEqual([]);
    });

    it('builds a removable search pill', () => {
        const onSearchChange = vi.fn();
        const pills = buildActivityLogActiveFilterPills({
            search: 'alpe',
            onSearchChange,
        });

        expect(pills).toHaveLength(1);
        expect(pills[0].label).toBe('Search: "alpe"');
        pills[0].onRemove();
        expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('builds quick filter pills with remove handlers', () => {
        const onLongRideOnlyChange = vi.fn();
        const onRollingDaysChange = vi.fn();

        const pills = buildActivityLogActiveFilterPills({
            longRideOnly: true,
            rollingDays: 30,
            onLongRideOnlyChange,
            onRollingDaysChange,
        });

        expect(pills.map((p) => p.label)).toEqual(['Last 30d', 'Long ride']);

        pills.find((p) => p.id === 'longRide').onRemove();
        expect(onLongRideOnlyChange).toHaveBeenCalledWith(false);

        pills.find((p) => p.id === 'r30').onRemove();
        expect(onRollingDaysChange).toHaveBeenCalledWith(null);
    });

    it('builds sport type and gear pills', () => {
        const toggleSportType = vi.fn();
        const onFilterGearIdChange = vi.fn();

        const pills = buildActivityLogActiveFilterPills({
            activeSportTypes: ['GravelRide'],
            toggleSportType,
            filterGearId: 'bike-1',
            gearFilterOptions: [{ id: 'bike-1', label: 'Canyon' }],
            onFilterGearIdChange,
        });

        expect(pills.map((p) => p.label)).toEqual(['Gravel', 'Bike: Canyon']);

        pills.find((p) => p.id === 'type-GravelRide').onRemove();
        expect(toggleSportType).toHaveBeenCalledWith('GravelRide');

        pills.find((p) => p.id === 'gear').onRemove();
        expect(onFilterGearIdChange).toHaveBeenCalledWith('');
    });

    it('builds metric preset and manual range pills', () => {
        const toggleMetricPreset = vi.fn();
        const onFilterKjMinChange = vi.fn();
        const onFilterKjMaxChange = vi.fn();

        const pills = buildActivityLogActiveFilterPills({
            activeMetricPresetIds: ['kj-min-1500'],
            toggleMetricPreset,
            filterKjMin: '1500',
            filterKjMax: '',
            onFilterKjMinChange,
            onFilterKjMaxChange,
        });

        expect(pills.some((p) => p.id === 'preset-kj-min-1500')).toBe(true);
        expect(pills.some((p) => p.label === 'kJ ≥ 1500')).toBe(true);

        pills.find((p) => p.id === 'preset-kj-min-1500').onRemove();
        expect(toggleMetricPreset).toHaveBeenCalledWith('kj-min-1500');

        pills.find((p) => p.id === 'kj').onRemove();
        expect(onFilterKjMinChange).toHaveBeenCalledWith('');
        expect(onFilterKjMaxChange).toHaveBeenCalledWith('');
    });
});
