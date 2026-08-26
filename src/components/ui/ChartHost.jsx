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

        const onFocusIn = (event) => {
            releaseChartFocus(event.target);
        };

        const onPointerUp = () => {
            releaseChartFocus(document.activeElement);
            // Recharts often focuses tooltip/SVG after pointerup — blur on next frames too.
            requestAnimationFrame(() => {
                releaseChartFocus(document.activeElement);
                requestAnimationFrame(() => releaseChartFocus(document.activeElement));
            });
        };

        const observer = new MutationObserver(() => stripChartFocusability(host));
        observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['tabindex'] });
        stripChartFocusability(host);

        host.addEventListener('focusin', onFocusIn, true);
        host.addEventListener('pointerup', onPointerUp, true);

        return () => {
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
