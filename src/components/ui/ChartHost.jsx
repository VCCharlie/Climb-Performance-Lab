import React, { useEffect, useRef } from 'react';
import { cn } from './cn';
import { chartHostClass } from '../../utils/chartTheme';
import {
    releaseChartFocus,
    shouldReleaseChartFocus,
    stripChartFocusability,
} from '../../utils/chartFocusRelease';

/**
 * Wraps Recharts ResponsiveContainer — suppresses sticky tap/click focus rings on chart SVG
 * while keeping keyboard UX on surrounding buttons and controls.
 */
export default function ChartHost({ className, style, children, hostRef, ...rest }) {
    const localRef = useRef(null);
    const strippingRef = useRef(false);

    const setRef = (node) => {
        localRef.current = node;
        if (typeof hostRef === 'function') {
            hostRef(node);
        } else if (hostRef) {
            hostRef.current = node;
        }
    };

    useEffect(() => {
        const host = localRef.current;
        if (!host) return undefined;

        const runStrip = () => {
            if (strippingRef.current) return;
            strippingRef.current = true;
            try {
                stripChartFocusability(host);
            } finally {
                strippingRef.current = false;
            }
        };

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

        // Only childList — observing tabindex + mutating tabindex caused an infinite observer loop (page hang).
        const observer = new MutationObserver((mutations) => {
            const structural = mutations.some(
                (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0),
            );
            if (structural) runStrip();
        });
        observer.observe(host, { childList: true, subtree: true });

        const rafId = requestAnimationFrame(() => runStrip());

        host.addEventListener('focusin', onFocusIn, true);
        host.addEventListener('pointerup', onPointerUp, true);

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
            host.removeEventListener('focusin', onFocusIn, true);
            host.removeEventListener('pointerup', onPointerUp, true);
        };
    }, []);

    return (
        <div
            ref={setRef}
            className={cn(
                chartHostClass,
                'outline-none focus:outline-none focus-visible:outline-none',
                className,
            )}
            style={style}
            {...rest}
        >
            {children}
        </div>
    );
}

export { shouldReleaseChartFocus, releaseChartFocus };
