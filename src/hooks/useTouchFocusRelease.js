import { useEffect } from 'react';

const TOUCH_FOCUS_SELECTORS = [
    '.recharts-surface',
    '.recharts-wrapper',
    '.recharts-tooltip-wrapper',
].join(', ');

/**
 * Mobile browsers keep :focus on tapped elements (charts, buttons) until elsewhere is tapped.
 * Blur pointer-driven focus so themed :focus-visible rings stay keyboard-only.
 */
export default function useTouchFocusRelease() {
    useEffect(() => {
        const releaseTouchFocus = (event) => {
            if (event.pointerType !== 'touch') return;

            const active = document.activeElement;
            if (!(active instanceof Element)) return;
            if (!active.matches(TOUCH_FOCUS_SELECTORS)) return;

            active.blur();
        };

        document.addEventListener('pointerup', releaseTouchFocus, true);
        return () => document.removeEventListener('pointerup', releaseTouchFocus, true);
    }, []);
}
