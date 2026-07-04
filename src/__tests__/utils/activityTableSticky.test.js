import { describe, it, expect } from 'vitest';
import {
    buildStickyColumnMeta,
    stickyTableCellProps,
    stickyActionsCellProps,
    hasPinnedColumns,
    PINNED_TABLE_COLUMN_KEYS,
} from '../../utils/activityTableSticky';

const essentialCols = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Title' },
    { key: 'distance', label: 'Dist' },
];

describe('activityTableSticky', () => {
    it('pins date, type, title with cumulative left offsets', () => {
        const meta = buildStickyColumnMeta(essentialCols, false);
        expect(meta.get('date')).toEqual({ left: 0, zIndex: 11, width: 68 });
        expect(meta.get('type')).toEqual({ left: 68, zIndex: 11, width: 36 });
        expect(meta.get('title')).toEqual({ left: 104, zIndex: 12, width: 240 });
    });

    it('offsets pinned columns when bulk select is shown', () => {
        const meta = buildStickyColumnMeta(essentialCols, true);
        expect(meta.get('__bulk__')).toEqual({ left: 0, zIndex: 13 });
        expect(meta.get('date')?.left).toBe(32);
    });

    it('stickyTableCellProps returns empty when column is not pinned', () => {
        const meta = buildStickyColumnMeta(essentialCols, false);
        const props = stickyTableCellProps('distance', meta);
        expect(props.className).toBe('');
        expect(props.style).toBeUndefined();
    });

    it('stickyTableCellProps adds header and selected classes', () => {
        const meta = buildStickyColumnMeta(essentialCols, true);
        const head = stickyTableCellProps('title', meta, { isHeader: true });
        expect(head.className).toContain('activity-table-sticky-head');
        expect(head.style?.left).toBe(136);

        const selected = stickyTableCellProps('date', meta, { isSelected: true, showBulkSelect: true });
        expect(selected.className).toContain('activity-table-sticky-selected');
    });

    it('hasPinnedColumns reflects bulk or pinned keys', () => {
        expect(hasPinnedColumns([{ key: 'distance' }], false)).toBe(false);
        expect(hasPinnedColumns([{ key: 'distance' }], true)).toBe(true);
        expect(hasPinnedColumns(essentialCols, false)).toBe(true);
    });

    it('pins actions column on the right when pinActions is true', () => {
        const meta = buildStickyColumnMeta(essentialCols, true, true);
        expect(meta.get('__actions__')).toEqual({ right: 0, zIndex: 14, width: 96 });
        const props = stickyActionsCellProps(meta, { isHeader: true });
        expect(props.className).toContain('activity-table-sticky-right');
        expect(props.style?.right).toBe(0);
    });

    it('exports expected pinned keys', () => {
        expect(PINNED_TABLE_COLUMN_KEYS).toEqual(['date', 'type', 'title']);
    });
});
