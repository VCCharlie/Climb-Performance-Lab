import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { chartCardShellClass } from '../../utils/chartTheme';
import {
    cdCollapsibleChevronClass,
    cdTypeCaption,
    cdTypeSection,
} from '../../utils/typography';
import { cn } from '../ui';

/**
 * Collapsible dashboard section card — chevron top-right in header row.
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
                className="w-full p-4 text-left hover:bg-cdborder/20 cd-transition cd-focus-ring"
                aria-expanded={expanded}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        {Icon ? (
                            <div className="mt-0.5 text-cdaccent shrink-0">
                                <Icon size={22} strokeWidth={2.2} aria-hidden />
                            </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                            <span className={cdTypeSection}>{title}</span>
                            {description ? (
                                <div className={cn(cdTypeCaption, 'mt-1 leading-relaxed')}>{description}</div>
                            ) : null}
                        </div>
                    </div>
                    <div className={cn(cdCollapsibleChevronClass, 'self-start pt-0.5')} aria-hidden>
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
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
