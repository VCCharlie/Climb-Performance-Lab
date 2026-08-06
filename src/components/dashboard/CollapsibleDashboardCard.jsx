import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { chartCardShellClass } from '../../utils/chartTheme';
import { cn } from '../ui';

/**
 * Collapsible dashboard section card — shared header pattern for Power tab panels.
 */
export default function CollapsibleDashboardCard({
    title,
    description,
    icon: Icon,
    defaultExpanded = true,
    children,
    className,
    bodyClassName,
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className={cn(chartCardShellClass, 'overflow-hidden', className)}>
            <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-cdborder/20 cd-transition cd-focus-ring"
                aria-expanded={expanded}
            >
                {Icon ? (
                    <div className="mt-0.5 text-cdaccent shrink-0">
                        <Icon size={22} strokeWidth={2.2} aria-hidden />
                    </div>
                ) : null}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-cdtext">{title}</span>
                        {expanded ? (
                            <ChevronDown size={18} className="text-cdmuted shrink-0" aria-hidden />
                        ) : (
                            <ChevronRight size={18} className="text-cdmuted shrink-0" aria-hidden />
                        )}
                    </div>
                    {description ? (
                        <div className="text-xs text-cdmuted mt-1 leading-relaxed">{description}</div>
                    ) : null}
                </div>
            </button>
            {expanded ? (
                <div className={cn('px-4 pb-4 pt-3 border-t border-cdborder/40', bodyClassName)}>
                    {children}
                </div>
            ) : null}
        </div>
    );
}
