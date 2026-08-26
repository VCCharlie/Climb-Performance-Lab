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
 * Browsers keep :focus on tapped/clicked chart SVG until elsewhere is activated.
 * Blur pointer-driven focus on Recharts and inside chart hosts so rings stay keyboard-only on real controls.
 */
export default function useTouchFocusRelease() {
    useEffect(() => {
        const releasePointerFocus = (event) => {
            const active = document.activeElement;
            if (!shouldReleaseTouchFocus(active)) return;

            // Chart SVG / wrapper: release after any pointer (touch + mouse click).
            if (active.matches(RECHARTS_FOCUS_SELECTORS) || active.closest(RECHARTS_FOCUS_SELECTORS)) {
                active.blur();
                return;
            }

            // Inside chart host but not a focusable control: touch only (scrubber wrappers).
            if (event.pointerType !== 'touch') return;
            active.blur();
        };

        document.addEventListener('pointerup', releasePointerFocus, true);
        return () => document.removeEventListener('pointerup', releasePointerFocus, true);
    }, []);
}
