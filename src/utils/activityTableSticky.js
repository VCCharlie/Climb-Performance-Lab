/** Pinned left columns while horizontally scrolling the activity table (desktop). */
export const PINNED_TABLE_COLUMN_KEYS = ['date', 'type', 'title'];

const COLUMN_STICKY_WIDTH_PX = {
    date: 68,
    type: 36,
    title: 240,
};

const BULK_SELECT_STICKY_WIDTH_PX = 32;
const ACTIONS_STICKY_WIDTH_PX = 96;

/** Body sticky cells stay below the sticky thead (z-20) when scrolling vertically. */
const BODY_STICKY_Z = {
    bulk: 3,
    date: 2,
    type: 2,
    title: 3,
    actions: 4,
};

/** Header sticky corners must sit above body stickies during horizontal scroll. */
const HEADER_STICKY_Z_OFFSET = 20;

export const STICKY_ACTIONS_KEY = '__actions__';

/**
 * Compute sticky `left` offsets for pinned columns in visible order.
 * Optionally pins the actions column on the right.
 * @returns {Map<string, { left?: number, right?: number, zIndex: number, width?: number }>}
 */
export function buildStickyColumnMeta(visibleColumns, showBulkSelect = false, pinActions = false) {
    const meta = new Map();
    let left = 0;

    if (showBulkSelect) {
        meta.set('__bulk__', { left: 0, zIndex: BODY_STICKY_Z.bulk });
        left += BULK_SELECT_STICKY_WIDTH_PX;
    }

    for (const col of visibleColumns) {
        if (!PINNED_TABLE_COLUMN_KEYS.includes(col.key)) continue;
        const width = COLUMN_STICKY_WIDTH_PX[col.key] ?? 72;
        meta.set(col.key, {
            left,
            zIndex: col.key === 'title' ? BODY_STICKY_Z.title : BODY_STICKY_Z.date,
            width,
        });
        left += width;
    }

    if (pinActions) {
        meta.set(STICKY_ACTIONS_KEY, { right: 0, zIndex: BODY_STICKY_Z.actions, width: ACTIONS_STICKY_WIDTH_PX });
    }

    return meta;
}

/**
 * Props for a sticky table header/body cell.
 * @param {string} key — column key or `__bulk__`
 */
export function stickyTableCellProps(key, meta, { isHeader = false, isSelected = false, showBulkSelect = false } = {}) {
    const sticky = meta?.get(key);
    if (!sticky) {
        return { className: '', style: undefined };
    }

    const classes = [
        isHeader ? 'activity-table-sticky-head' : 'activity-table-sticky-body',
    ];
    if (!isHeader && isSelected && showBulkSelect) {
        classes.push('activity-table-sticky-selected');
    }
    if (key === 'title') {
        classes.push('activity-table-sticky-edge');
    }

    return {
        className: classes.join(' '),
        style: {
            left: sticky.left,
            zIndex: isHeader ? sticky.zIndex + HEADER_STICKY_Z_OFFSET : sticky.zIndex,
        },
    };
}

/**
 * Props for the sticky right actions column.
 */
export function stickyActionsCellProps(meta, { isHeader = false, isSelected = false, showBulkSelect = false } = {}) {
    const sticky = meta?.get(STICKY_ACTIONS_KEY);
    if (!sticky) {
        return { className: '', style: undefined };
    }

    const classes = [
        isHeader ? 'activity-table-sticky-head' : 'activity-table-sticky-body',
        'activity-table-sticky-right',
        'activity-table-sticky-edge-left',
    ];
    if (!isHeader && isSelected && showBulkSelect) {
        classes.push('activity-table-sticky-selected');
    }

    return {
        className: classes.join(' '),
        style: {
            right: sticky.right,
            zIndex: isHeader ? sticky.zIndex + HEADER_STICKY_Z_OFFSET : sticky.zIndex,
        },
    };
}

/** Whether horizontal scroll affordances should show (any pinned columns). */
export function hasPinnedColumns(visibleColumns, showBulkSelect) {
    if (showBulkSelect) return true;
    return visibleColumns.some((c) => PINNED_TABLE_COLUMN_KEYS.includes(c.key));
}
