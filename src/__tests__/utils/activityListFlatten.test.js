import { describe, it, expect } from 'vitest';
import {
    flattenActivityList,
    sortGroupedYears,
    sortGroupedMonths,
    estimateFlattenedRowSize,
    getFlattenedRowKey,
    shouldVirtualizeActivityList,
    ACTIVITY_LIST_VIRTUALIZE_THRESHOLD,
} from '../../utils/activityListFlatten';

describe('activityListFlatten', () => {
    const grouped = {
        2024: {
            January: [{ id: 'a1' }, { id: 'a2' }],
            March: [{ id: 'a3' }],
        },
        2023: {
            December: [{ id: 'b1' }],
        },
    };

    it('flattens grouped view respecting expand state', () => {
        const rows = flattenActivityList({
            activities: grouped,
            isGroupedView: true,
            sortConfig: { direction: 'desc' },
            isYearExpanded: (year) => year === '2024',
            isMonthExpanded: (year, month) => !(year === '2024' && month === 'March'),
        });

        expect(rows.map((r) => r.type)).toEqual([
            'year',
            'month',
            'month',
            'activity',
            'activity',
            'year',
        ]);
        expect(rows.filter((r) => r.type === 'activity')).toHaveLength(2);
    });

    it('flattens flat array', () => {
        const rows = flattenActivityList({
            activities: [{ id: '1' }, { id: '2' }],
            isGroupedView: false,
        });
        expect(rows).toEqual([
            { type: 'activity', act: { id: '1' } },
            { type: 'activity', act: { id: '2' } },
        ]);
    });

    it('includes select-all row when requested', () => {
        const rows = flattenActivityList({
            activities: [{ id: '1' }],
            isGroupedView: false,
            includeSelectAll: true,
        });
        expect(rows[0]).toEqual({ type: 'selectAll' });
    });

    it('sorts years and months', () => {
        expect(sortGroupedYears(['2022', '2024', '2023'], 'desc')).toEqual(['2024', '2023', '2022']);
        expect(sortGroupedMonths(['January', 'March', 'February'], 'desc')[0]).toBe('March');
    });

    it('estimates row sizes and keys', () => {
        expect(estimateFlattenedRowSize({ type: 'year' }, 'table')).toBeGreaterThan(0);
        expect(getFlattenedRowKey({ type: 'activity', act: { id: 'x' } }, 0)).toBe('act-x');
    });

    it('virtualizes at threshold', () => {
        const rows = Array.from({ length: ACTIVITY_LIST_VIRTUALIZE_THRESHOLD }, (_, i) => ({
            type: 'activity',
            act: { id: String(i) },
        }));
        expect(shouldVirtualizeActivityList(rows)).toBe(true);
        expect(shouldVirtualizeActivityList(rows.slice(0, -1))).toBe(false);
    });
});
