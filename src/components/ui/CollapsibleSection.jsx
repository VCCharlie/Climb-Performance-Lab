import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Reusable collapsible panel — chevron top-right, title left.
 */
export default function CollapsibleSection({
    title,
    subtitle,
    icon: Icon,
    iconClassName = 'text-cdaccent',
    defaultExpanded = true,
    expanded: controlledExpanded,
    onExpandedChange,
    borderClassName = 'border-cdborder',
    children,
    headerExtra,
    id,
    sectionRef,
}) {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isControlled = controlledExpanded !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;

    const setExpanded = (next) => {
        if (!isControlled) setInternalExpanded(next);
        onExpandedChange?.(next);
    };

    return (
        <div
            id={id}
            ref={sectionRef}
            className={`bg-cdsurface rounded-xl border ${borderClassName} shadow-xl`}
        >
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 sm:p-5 border-b border-cdborder text-left hover:bg-cdborder/10 transition-colors"
                aria-expanded={expanded}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            {Icon ? <Icon size={20} className={`shrink-0 ${iconClassName}`} /> : null}
                            <span className="min-w-0">{title}</span>
                        </h3>
                        {subtitle ? (
                            <p className="text-xs text-cdmuted mt-1 leading-relaxed">{subtitle}</p>
                        ) : null}
                    </div>
                    <div className="shrink-0 self-start pt-0.5 text-cdmuted" aria-hidden>
                        {expanded
                            ? <ChevronDown size={18} />
                            : <ChevronRight size={18} />}
                    </div>
                </div>
                {headerExtra ? (
                    <div
                        className="mt-3 flex flex-wrap gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        {headerExtra}
                    </div>
                ) : null}
            </button>

            {expanded ? (
                <div className="p-4 sm:p-5 space-y-4">
                    {children}
                </div>
            ) : null}
        </div>
    );
}
