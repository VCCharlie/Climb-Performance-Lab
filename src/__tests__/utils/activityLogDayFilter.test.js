import { describe, it, expect, vi } from 'vitest';
import {
    activityCalendarYmd,
    activityMatchesDayFilter,
    captureFilterStateForDayUndo,
    applyFilterSnapshotToSetters,
} from '../../utils/activityLogDayFilter';

describe('activityLogDayFilter', () => {
    it('activityCalendarYmd handles ISO datetime', () => {
        expect(activityCalendarYmd('2026-03-15T14:30:00.000Z')).toBe('2026-03-15');
        expect(activityCalendarYmd('2026-03-15')).toBe('2026-03-15');
    });

    it('activityMatchesDayFilter compares calendar date only', () => {
        expect(activityMatchesDayFilter({ date: '2026-03-15T08:00:00Z' }, '2026-03-15')).toBe(true);
        expect(activityMatchesDayFilter({ date: '2026-03-16' }, '2026-03-15')).toBe(false);
        expect(activityMatchesDayFilter({ date: '2026-03-15' }, null)).toBe(true);
    });

    it('captureFilterStateForDayUndo includes sort and preset', () => {
        const snap = captureFilterStateForDayUndo({
            search: 'cols',
            indoorFilter: 'outdoor',
            sortConfig: { key: 'load', direction: 'asc' },
            activeLogFilterPresetId: 'outdoor',
            filterPowerMin: '200',
            activeMetricPresetIds: ['long'],
        });
        expect(snap.search).toBe('cols');
        expect(snap.sortConfig).toEqual({ key: 'load', direction: 'asc' });
        expect(snap.activeLogFilterPresetId).toBe('outdoor');
        expect(snap.filterPowerMin).toBe('200');
        expect(snap.activeMetricPresetIds).toEqual(['long']);
    });

    it('applyFilterSnapshotToSetters restores chip, metric, sort, and preset state', () => {
        const setSearch = vi.fn();
        const setIndoorFilter = vi.fn();
        const setSortConfig = vi.fn();
        const setActiveLogFilterPresetId = vi.fn();
        const applyMetricFilterState = vi.fn();

        applyFilterSnapshotToSetters(
            captureFilterStateForDayUndo({
                search: 'alpe',
                indoorFilter: 'indoor',
                thisWeekOnly: true,
                sortConfig: { key: 'title', direction: 'desc' },
                activeLogFilterPresetId: 'week',
                filterDistMin: '50',
            }),
            {
                setSearch,
                setIndoorFilter,
                setThisWeekOnly: vi.fn(),
                setRollingDays: vi.fn(),
                setStravaLinkedOnly: vi.fn(),
                setNoStravaLinkOnly: vi.fn(),
                setPossibleDuplicatesOnly: vi.fn(),
                setNoPowerOnly: vi.fn(),
                setWithPowerOnly: vi.fn(),
                setHighLoadOnly: vi.fn(),
                setLongRideOnly: vi.fn(),
                setMissingHrOnly: vi.fn(),
                setVirtualRideChip: vi.fn(),
                setGravelRideChip: vi.fn(),
                setMtbRideChip: vi.fn(),
                setEbikeRideChip: vi.fn(),
                setMinTss: vi.fn(),
                setFilterGearId: vi.fn(),
                setActiveMetricPresetIds: vi.fn(),
                setActiveLogFilterPresetId,
                setSortConfig,
                applyMetricFilterState,
            },
        );

        expect(setSearch).toHaveBeenCalledWith('alpe');
        expect(setIndoorFilter).toHaveBeenCalledWith('indoor');
        expect(setSortConfig).toHaveBeenCalledWith({ key: 'title', direction: 'desc' });
        expect(setActiveLogFilterPresetId).toHaveBeenCalledWith('week');
        expect(applyMetricFilterState).toHaveBeenCalled();
    });
});
