import React from 'react';
import { cn } from '../ui/cn';

/**
 * Reusable tab page shell: [Header: title + subtitle + optional action] → [SubTabNav | SegmentedControl slot] → [content].
 * Use `cardShellClassName` to wrap sub-nav + content in a card while keeping the header outside (Activities).
 */
export default function TabPageShell({
    title,
    subtitle,
    action,
    subNav,
    children,
    className,
    headerClassName,
    contentClassName,
    cardShellClassName,
}) {
    const subNavAndContent = (
        <>
            {subNav}
            {children ? (
                <div className={cn(contentClassName)}>{children}</div>
            ) : null}
        </>
    );

    return (
        <div
            className={cn(
                'space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500',
                className,
            )}
        >
            {(title || subtitle || action) && (
                <div
                    className={cn(
                        'bg-cdsurface p-3 md:p-4 rounded-xl border border-cdborder shadow-md flex items-start justify-between gap-3',
                        headerClassName,
                    )}
                >
                    <div className="min-w-0">
                        {title ? (
                            <h2 className="text-xl md:text-2xl font-bold text-cdtext tracking-tight">{title}</h2>
                        ) : null}
                        {subtitle ? (
                            <p className="hidden md:block text-cdmuted text-sm mt-0.5">{subtitle}</p>
                        ) : null}
                    </div>
                    {action ? <div className="shrink-0">{action}</div> : null}
                </div>
            )}

            {cardShellClassName ? (
                <div className={cn(cardShellClassName)}>{subNavAndContent}</div>
            ) : (
                subNavAndContent
            )}
        </div>
    );
}
