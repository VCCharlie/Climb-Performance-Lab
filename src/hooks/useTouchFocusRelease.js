import { useEffect } from 'react';
import { releaseChartFocus, shouldReleaseChartFocus } from '../utils/chartFocusRelease';

/**
 * Browsers keep :focus on tapped/clicked chart SVG until elsewhere is activated.
 * Blur chart focus on focusin (immediate) and pointerup (deferred — Recharts focuses after up).
 */
export default function useTouchFocusRelease() {
    useEffect(() => {
        const onFocusIn = (event) => {
            releaseChartFocus(event.target);
        };

        const onPointerUp = () => {
            releaseChartFocus(document.activeElement);
            requestAnimationFrame(() => {
                releaseChartFocus(document.activeElement);
                requestAnimationFrame(() => releaseChartFocus(document.activeElement));
            });
        };

        document.addEventListener('focusin', onFocusIn, true);
        document.addEventListener('pointerup', onPointerUp, true);

        return () => {
            document.removeEventListener('focusin', onFocusIn, true);
            document.removeEventListener('pointerup', onPointerUp, true);
        };
    }, []);
}

export { shouldReleaseChartFocus };
