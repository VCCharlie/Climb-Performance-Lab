import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function summarizeText(text, maxLen = 96) {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= maxLen) return trimmed;
    const cut = trimmed.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    const end = lastSpace > 48 ? lastSpace : maxLen;
    return `${trimmed.slice(0, end).trim()}…`;
}

/**
 * One-line coach rationale with optional expand — keeps week panels dense.
 */
export default function CollapsibleCoachNote({
    text,
    expandLabel = 'Why this plan?',
    icon: Icon = null,
    tone = 'accent',
    maxSummaryLen = 96,
}) {
    const [open, setOpen] = useState(false);
    if (!text) return null;

    const summary = summarizeText(text, maxSummaryLen);
    const needsExpand = text.trim().length > summary.replace(/…$/, '').length + 8;

    const containerTone = tone === 'warn'
        ? 'border border-cdborder/40 border-l-[3px] border-l-cdaccent/40 bg-cdborder/10 text-cdmuted'
        : tone === 'muted'
            ? 'border border-cdborder/30 bg-cdborder/5 text-cdmuted'
            : 'border border-cdborder/30 border-l-[3px] border-l-cdborder/60 bg-cdborder/5 text-cdmuted';

    return (
        <div className={`mb-1.5 rounded px-2 py-1 text-[10px] leading-snug ${containerTone}`}>
            <div className="flex items-start gap-1 min-w-0">
                {Icon ? (
                    <Icon
                        size={10}
                        className="shrink-0 mt-0.5 text-cdmuted group-hover:text-cdaccent"
                        aria-hidden
                    />
                ) : null}
                <p className="min-w-0 flex-1">
                    {open ? text : summary}
                </p>
                {needsExpand && (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-cdmuted hover:text-cdaccent focus:text-cdaccent"
                        aria-expanded={open}
                    >
                        {open ? 'Less' : expandLabel}
                        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                )}
            </div>
        </div>
    );
}

export { summarizeText };
