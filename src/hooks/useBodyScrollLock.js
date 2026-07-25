import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/**
 * Prevents background scroll while overlays/menus are open (ref-counted for nested modals).
 */
export function useBodyScrollLock(active) {
    useEffect(() => {
        if (!active || typeof document === 'undefined') return undefined;

        if (lockCount === 0) {
            previousOverflow = document.body.style.overflow;
            previousPaddingRight = document.body.style.paddingRight;
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }
        lockCount += 1;

        return () => {
            lockCount = Math.max(0, lockCount - 1);
            if (lockCount === 0) {
                document.body.style.overflow = previousOverflow;
                document.body.style.paddingRight = previousPaddingRight;
            }
        };
    }, [active]);
}

export function resetBodyScrollLockForTests() {
    lockCount = 0;
    if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}
