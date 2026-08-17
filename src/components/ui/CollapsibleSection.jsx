import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Reusable collapsible panel — same pattern as Data Playground.
 */
export default function CollapsibleSection({
    title,
    subtitle,
    icon: Icon,
    iconClassName = 'text-cdaccent',
    defaultExpanded = true,
    borderClassName = 'border-cdborder',
    children,
    headerExtra,
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className={`bg-cdsurface rounded-xl border ${borderClassName} shadow-xl`}>
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full p-4 sm:p-5 border-b border-cdborder text-left hover:bg-cdborder/10 transition-colors"
            >
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            {Icon ? <Icon size={20} className={`shrink-0 ${iconClassName}`} /> : null}
                            <span className="min-w-0">{title}</span>
                        </h3>
                        {subtitle ? (
                            <p className="text-xs text-cdmuted mt-1 leading-relaxed">{subtitle}</p>
                        ) : null}
                    </div>
                    <div className="shrink-0 mt-1 text-cdmuted">
                        {expanded
                            ? <ChevronDown size={18} aria-hidden />
                            : <ChevronRight size={18} aria-hidden />}
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
