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
        <div className={`bg-cdsurface rounded-xl border ${borderClassName} shadow-xl overflow-hidden`}>
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full p-5 border-b border-cdborder flex items-start justify-between gap-3 text-left hover:bg-cdborder/10 transition-colors"
            >
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                        {Icon ? <Icon size={20} className={`shrink-0 ${iconClassName}`} /> : null}
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="text-xs text-cdmuted mt-1 leading-relaxed">{subtitle}</p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                    {headerExtra}
                    {expanded
                        ? <ChevronDown size={18} className="text-cdmuted" />
                        : <ChevronRight size={18} className="text-cdmuted" />}
                </div>
            </button>

            {expanded ? (
                <div className="p-5 space-y-4">
                    {children}
                </div>
            ) : null}
        </div>
    );
}
