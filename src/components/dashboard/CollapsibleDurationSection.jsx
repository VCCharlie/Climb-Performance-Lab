import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Accordion block for a single duration / period row — keeps long dashboard lists compact.
 */
export default function CollapsibleDurationSection({
    label,
    summary,
    footnote,
    defaultExpanded = false,
    accentClassName = 'text-cdaccent',
    children,
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className="rounded-lg border border-cdborder/60 bg-cdborder/5 overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-cdborder/15 transition-colors"
                aria-expanded={expanded}
            >
                {expanded ? (
                    <ChevronDown size={16} className="text-cdmuted shrink-0" aria-hidden />
                ) : (
                    <ChevronRight size={16} className="text-cdmuted shrink-0" aria-hidden />
                )}
                <span className={`text-sm font-bold shrink-0 ${accentClassName}`}>{label}</span>
                {summary ? (
                    <span className="text-sm font-mono font-bold text-cdtext tabular-nums ml-auto shrink-0">
                        {summary}
                    </span>
                ) : null}
            </button>
            {footnote && !expanded && (
                <p className="text-[10px] text-cdmuted px-3 pb-2 leading-snug max-w-3xl">{footnote}</p>
            )}
            {expanded && (
                <div className="px-3 pb-3 pt-0 border-t border-cdborder/40">
                    {footnote && (
                        <p className="text-[10px] text-cdmuted mb-2 pt-2 leading-snug max-w-3xl">{footnote}</p>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
}
