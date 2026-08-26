import React, { useEffect, useRef } from 'react';
import { cn } from './cn';
import { chartHostClass } from '../../utils/chartTheme';

const RECHARTS_FOCUS_SELECTORS = '.recharts-surface, .recharts-wrapper, .recharts-tooltip-wrapper';

function isChartFocusTarget(element) {
    if (!(element instanceof Element)) return false;
    return element.matches(`${RECHARTS_FOCUS_SELECTORS}, svg`) || Boolean(element.closest(RECHARTS_FOCUS_SELECTORS));
}

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

        const releaseChartFocus = () => {
            const active = document.activeElement;
            if (!(active instanceof Element)) return;
            if (!host.contains(active)) return;
            if (!isChartFocusTarget(active)) return;
            active.blur();
        };

        host.addEventListener('pointerup', releaseChartFocus, true);
        return () => host.removeEventListener('pointerup', releaseChartFocus, true);
    }, []);

    return (
        <div
            ref={setRef}
            className={cn(
                chartHostClass,
                'outline-none focus:outline-none focus-visible:outline-none',
                className,
            )}
            tabIndex={-1}
            style={style}
            {...rest}
        >
            {children}
        </div>
    );
}
