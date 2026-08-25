import React from 'react';
import { cn } from './cn';

/**
 * Accessible toggle switch — fixed track/thumb sizing for mobile layouts.
 */
export default function Switch({
    checked,
    onChange,
    ariaLabel,
    className,
    activeClassName = 'bg-cdgreen',
    inactiveClassName = 'bg-cdsurfacehigh',
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full cd-transition cd-focus-ring',
                checked ? activeClassName : inactiveClassName,
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm cd-transition transform',
                    checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}
