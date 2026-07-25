import { useEffect, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { computeAnchoredOverlayStyle } from '../../utils/anchoredOverlayPosition';

/**
 * Dropdown menu positioned relative to an anchor; escapes overflow:hidden parents.
 */
export default function AnchoredDropdownPortal({
    open,
    anchorRef,
    onClose,
    children,
    className = '',
    align = 'end',
    minWidth = 224,
    closeOnOutsideClick = true,
    role = 'menu',
    'aria-label': ariaLabel,
}) {
    const [style, setStyle] = useState(null);
    const listId = useId();

    useEffect(() => {
        if (!open) {
            setStyle(null);
            return undefined;
        }

        const update = () => {
            const el = anchorRef?.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setStyle(computeAnchoredOverlayStyle(rect, { minWidth, align }));
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

    useEffect(() => {
        if (!open || !closeOnOutsideClick) return undefined;
        const onDoc = (e) => {
            const anchor = anchorRef?.current;
            if (anchor?.contains(e.target)) return;
            if (e.target.closest?.('[data-anchored-dropdown]')) return;
            onClose?.();
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('touchstart', onDoc, { passive: true });
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('touchstart', onDoc);
        };
    }, [open, closeOnOutsideClick, anchorRef, onClose]);

    if (!open || !style) return null;

    const { placement: _placement, ...positionStyle } = style;

    return createPortal(
        <div
            id={listId}
            role={role}
            aria-label={ariaLabel}
            data-anchored-dropdown=""
            data-placement={style.placement}
            style={positionStyle}
            className={`bg-cdsurface border border-cdborder rounded-lg shadow-xl overflow-x-hidden custom-scrollbar ${className}`.trim()}
        >
            {children}
        </div>,
        document.body,
    );
}
