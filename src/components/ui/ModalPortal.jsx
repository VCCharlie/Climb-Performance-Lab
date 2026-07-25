import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

/**
 * Renders children on document.body so `position: fixed` modals are viewport-relative
 * (not clipped by DataHub overflow/transform ancestors).
 */
export default function ModalPortal({ children, lockScroll = true }) {
    useBodyScrollLock(lockScroll);

    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}
