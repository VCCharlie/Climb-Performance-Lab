import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubFilterBar } from '../../hooks/useDataHubFilterBar';

vi.mock('../../utils/activityLogLayout', () => ({
    prefersActivityCardLayout: () => false,
}));

function makeBaseArgs(overrides = {}) {
    return {
        search: '',
        setSearch: vi.fn(),
        indoorFilter: false,
        setIndoorFilter: vi.fn(),
        activeSportTypes: [],
        setActiveSportTypes: vi.fn(),
        toggleSportType: vi.fn(),
        useCardLayout: false,
        visibleKeys: [],
        activePreset: null,
        applyPreset: vi.fn(),
        toggleColumn: vi.fn(),
        isColumnVisible: vi.fn(() => true),
        onRefresh: vi.fn(),
        intervalsSync: { isSyncing: false, handleIntervalsSync: vi.fn() },
        bulk: { bulkSelectedIds: new Set(), clearSelection: vi.fn() },
        dataImport: { handleImport: vi.fn(), findDuplicates: vi.fn() },
        openNoPowerFilter: vi.fn(),
        handleClearDatabase: vi.fn(),
        activities: [],
        isDeleting: false,
        thisWeekOnly: false,
        setThisWeekOnly: vi.fn(),
        rollingDays: null,
        setRollingDays: vi.fn(),
        stravaGetToken: null,
        stravaLinkedOnly: false,
        setStravaLinkedOnly: vi.fn(),
        noPowerOnly: false,
        setNoPowerOnly: vi.fn(),
        withPowerOnly: false,
        setWithPowerOnly: vi.fn(),
        highLoadOnly: false,
        setHighLoadOnly: vi.fn(),
        longRideOnly: false,
        setLongRideOnly: vi.fn(),
        missingHrOnly: false,
        setMissingHrOnly: vi.fn(),
        minTss: '',
        setMinTss: vi.fn(),
        gearFilterOptions: [],
        filterGearId: '',
        setFilterGearId: vi.fn(),
        activityLogRangesExpanded: false,
        onActivityLogRangesExpandedChange: vi.fn(),
        metricRangeActive: false,
        clearMetricFilters: vi.fn(),
        activeMetricPresetIds: [],
        toggleMetricPreset: vi.fn(),
        clearActiveMetricPresets: vi.fn(),
        filterDistMin: '',
        setFilterDistMin: vi.fn(),
        filterDistMax: '',
        setFilterDistMax: vi.fn(),
        filterSpeedMin: '',
        setFilterSpeedMin: vi.fn(),
        filterSpeedMax: '',
        setFilterSpeedMax: vi.fn(),
        filterPowerMin: '',
        setFilterPowerMin: vi.fn(),
        filterPowerMax: '',
        setFilterPowerMax: vi.fn(),
        filterDurMinMin: '',
        setFilterDurMinMin: vi.fn(),
        filterDurMaxMin: '',
        setFilterDurMaxMin: vi.fn(),
        filterElevMin: '',
        setFilterElevMin: vi.fn(),
        filterElevMax: '',
        setFilterElevMax: vi.fn(),
        filterKjMin: '',
        setFilterKjMin: vi.fn(),
        filterKjMax: '',
        setFilterKjMax: vi.fn(),
        setEditingActivity: vi.fn(),
        recoveryTss: 80,
        logFilterPresets: [],
        activeLogFilterPresetId: null,
        detectedLogFilterPresetId: null,
        applyLogFilterPreset: vi.fn(),
        resetLogFilters: vi.fn(),
        ...overrides,
    };
}

describe('useDataHubFilterBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns filterBarProps with search and recovery TSS', () => {
        const args = makeBaseArgs({ search: 'alpe', recoveryTss: 95 });
        const { result } = renderHook(() => useDataHubFilterBar(args));

        expect(result.current.filterBarProps.search).toBe('alpe');
        expect(result.current.filterBarProps.recoveryTss).toBe(95);
        expect(result.current.filterBarProps.filterBarRootRef).toBeDefined();
    });

    it('toggles util menu visibility', () => {
        const { result } = renderHook(() => useDataHubFilterBar(makeBaseArgs()));

        expect(result.current.showUtilMenu).toBe(false);

        act(() => result.current.setShowUtilMenu(true));
        expect(result.current.showUtilMenu).toBe(true);
    });

    it('passes stravaConnected when stravaGetToken is provided', () => {
        const tokenFn = vi.fn();
        const { result } = renderHook(() => useDataHubFilterBar(
            makeBaseArgs({ stravaGetToken: tokenFn }),
        ));

        expect(result.current.filterBarProps.stravaGetToken).toBe(tokenFn);
    });
});
