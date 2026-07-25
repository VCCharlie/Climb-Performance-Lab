/**
 * Viewport-aware position for anchored flyouts (dropdowns, autocomplete lists).
 *
 * @param {DOMRect} rect - anchor getBoundingClientRect()
 * @param {{ minWidth?: number, align?: 'start'|'end', margin?: number, gap?: number, maxHeightCap?: number }} opts
 */
export function computeAnchoredOverlayStyle(rect, opts = {}) {
    const margin = opts.margin ?? 8;
    const gap = opts.gap ?? 4;
    const minWidth = opts.minWidth ?? 224;
    const align = opts.align ?? 'end';

    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 390;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 844;
    const maxHeightCap = opts.maxHeightCap ?? Math.min(Math.round(viewportH * 0.55), 420);

    const width = Math.min(Math.max(minWidth, rect.width), viewportW - margin * 2);
    let left = align === 'end' ? rect.right - width : rect.left;
    left = Math.max(margin, Math.min(left, viewportW - width - margin));

    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

    const available = openAbove ? spaceAbove - gap : spaceBelow - gap;
    const maxHeight = Math.max(120, Math.min(maxHeightCap, available));

    const base = {
        position: 'fixed',
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 200,
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        placement: openAbove ? 'above' : 'below',
    };

    if (openAbove) {
        return {
            ...base,
            bottom: `${viewportH - rect.top + gap}px`,
            top: 'auto',
        };
    }

    return {
        ...base,
        top: `${rect.bottom + gap}px`,
        bottom: 'auto',
    };
}
