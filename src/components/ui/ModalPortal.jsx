import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children on document.body so `position: fixed` modals are viewport-relative
 * (not clipped by DataHub overflow/transform ancestors).
 */
export default function ModalPortal({ children, lockScroll = true }) {
    useEffect(() => {
        if (!lockScroll) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [lockScroll]);

    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}
