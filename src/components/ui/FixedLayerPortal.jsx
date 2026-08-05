import { createPortal } from 'react-dom';

/**
 * Renders children on document.body so `position: fixed` layers stay viewport-relative
 * (not trapped by transform/overflow ancestors such as cd-enter or animate-in).
 */
export default function FixedLayerPortal({ children }) {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}
