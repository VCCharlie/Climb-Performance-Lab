import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../ui/cn';

/**
 * Sync today's activities from Intervals.icu (same pipeline as Activity Log Fetch & merge).
 */
export default function DashboardTodaySyncButton({
    onSync,
    isBusy = false,
    disabled = false,
    className = '',
    size = 'md',
}) {
    if (!onSync) return null;

    const dim = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
    const icon = size === 'sm' ? 16 : 18;

    return (
        <button
            type="button"
            onClick={onSync}
            disabled={disabled || isBusy}
            className={cn(
                'flex items-center justify-center rounded-lg border border-cdborder bg-cdsurface text-cdmuted',
                'hover:text-green-400 hover:border-green-500/50 cd-transition',
                'focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none',
                'disabled:opacity-50 disabled:pointer-events-none',
                dim,
                className,
            )}
            title="Fetch & merge today's activities from Intervals.icu"
            aria-label="Sync today's activities from Intervals.icu"
        >
            <RefreshCw size={icon} className={isBusy ? 'animate-spin' : ''} aria-hidden />
        </button>
    );
}
