import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataHubLogDerivations } from '../../hooks/useDataHubLogDerivations';

vi.mock('../../hooks/useProfilerClimbMatches', () => ({
    useProfilerClimbMatches: () => new Map(),
}));

const baseActivities = [
    { id: 'a1', date: '2026-03-01', title: 'Early' },
    { id: 'a2', date: '2026-03-15', title: 'Mid' },
    { id: 'a3', date: '2026-04-01', title: 'Late' },
];

function renderDerivations(overrides = {}) {
    const clearMetricFilters = vi.fn();
    const props = {
        activities: baseActivities,
        focusActivityId: null,
        onFocusActivityCleared: vi.fn(),
        isolateActivityId: null,
        logDateRangeFilter: null,
        setInternalTab: vi.fn(),
        isGroupedView: false,
        openGroupedPathForActivity: vi.fn(),
        processedActivities: baseActivities,
        groupedActivities: null,
        sortConfig: { direction: 'desc' },
        isYearExpanded: () => true,
        isMonthExpanded: () => true,
        climbDatabaseForMatch: [],
        filterDistMin: '',
        filterDistMax: '',
        filterSpeedMin: '',
        filterSpeedMax: '',
        filterPowerMin: '',
        filterPowerMax: '',
        filterDurMinMin: '',
        filterDurMaxMin: '',
        filterElevMin: '',
        filterElevMax: '',
        filterKjMin: '',
        filterKjMax: '',
        clearMetricFilters,
        ...overrides,
    };

    const hook = renderHook(() => useDataHubLogDerivations(props));
    return { ...hook, clearMetricFilters };
}

describe('useDataHubLogDerivations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isolates a single activity in the log table', () => {
        const { result } = renderDerivations({
            isolateActivityId: 'a2',
        });

        expect(result.current.logTableActivities).toEqual([
            { id: 'a2', date: '2026-03-15', title: 'Mid' },
        ]);
        expect(result.current.logTableGrouped).toBe(false);
    });

    it('filters activities by log date range', () => {
        const { result } = renderDerivations({
            logDateRangeFilter: { startYmd: '2026-03-10', endYmd: '2026-03-31' },
        });

        expect(result.current.logTableActivities.map((a) => a.id)).toEqual(['a2']);
        expect(result.current.rangeFilteredActivities?.map((a) => a.id)).toEqual(['a2']);
    });

    it('detects active metric range filters', () => {
        const { result } = renderDerivations({
            filterPowerMin: '200',
        });

        expect(result.current.metricRangeActive).toBe(true);
    });

    it('applyMetricPreset clears filters then runs preset callback', () => {
        const { result, clearMetricFilters } = renderDerivations();
        const apply = vi.fn();

        act(() => {
            result.current.applyMetricPreset(apply);
        });

        expect(clearMetricFilters).toHaveBeenCalled();
        expect(apply).toHaveBeenCalled();
    });

    it('lists visible activity ids from processed activities', () => {
        const { result } = renderDerivations();

        expect(result.current.visibleActivityIdsFlat).toEqual(['a1', 'a2', 'a3']);
    });
});
