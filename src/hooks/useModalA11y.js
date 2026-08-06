import { useEffect, useRef } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
}

/**
 * Focus trap, Escape-to-close, and focus restore for modal dialogs.
 */
export function useModalA11y({ isOpen = true, onClose, initialFocusRef } = {}) {
    const panelRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        previousFocusRef.current = document.activeElement;

        const focusTarget = initialFocusRef?.current
            || getFocusableElements(panelRef.current)[0]
            || panelRef.current;
        focusTarget?.focus?.();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose?.();
                return;
            }

            if (event.key !== 'Tab' || !panelRef.current) return;

            const focusable = getFocusableElements(panelRef.current);
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            const previous = previousFocusRef.current;
            if (previous && typeof previous.focus === 'function') {
                previous.focus();
            }
        };
    }, [isOpen, onClose, initialFocusRef]);

    return panelRef;
}
