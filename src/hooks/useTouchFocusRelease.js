import { useEffect } from 'react';

const RECHARTS_FOCUS_SELECTORS = [
    '.recharts-surface',
    '.recharts-wrapper',
    '.recharts-tooltip-wrapper',
    '.recharts-default-tooltip',
].join(', ');

function shouldReleaseTouchFocus(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest('.cd-chart-host')) return true;
    return element.matches(RECHARTS_FOCUS_SELECTORS);
}

/**
 * Mobile browsers keep :focus on tapped elements (charts, buttons) until elsewhere is tapped.
 * Blur pointer-driven focus inside chart hosts so themed :focus-visible rings stay keyboard-only.
 */
export default function useTouchFocusRelease() {
    useEffect(() => {
        const releaseTouchFocus = (event) => {
            if (event.pointerType !== 'touch') return;

            const active = document.activeElement;
            if (!shouldReleaseTouchFocus(active)) return;

            active.blur();
        };

        document.addEventListener('pointerup', releaseTouchFocus, true);
        return () => document.removeEventListener('pointerup', releaseTouchFocus, true);
    }, []);
}
