import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Dropdown menu positioned below an anchor element; escapes overflow:hidden parents.
 */
export default function AnchoredDropdownPortal({
    open,
    anchorRef,
    onClose,
    children,
    className = '',
    align = 'end',
    minWidth = 224,
}) {
    const [style, setStyle] = useState(null);

    useEffect(() => {
        if (!open) {
            setStyle(null);
            return undefined;
        }

        const update = () => {
            const el = anchorRef?.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const width = Math.min(Math.max(minWidth, rect.width), window.innerWidth - 16);
            const margin = 8;
            let left = align === 'end' ? rect.right - width : rect.left;
            left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
            const top = rect.bottom + 4;
            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                zIndex: 200,
            });
        };

        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, anchorRef, align, minWidth]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !style) return null;

    return createPortal(
        <div
            role="menu"
            data-anchored-dropdown=""
            style={style}
            className={`bg-cdsurface border border-cdborder rounded-lg shadow-xl overflow-hidden ${className}`.trim()}
        >
            {children}
        </div>,
        document.body,
    );
}
