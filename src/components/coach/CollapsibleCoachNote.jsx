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

    const toneClasses = tone === 'warn'
        ? 'text-orange-300'
        : tone === 'muted'
            ? 'text-cdmuted'
            : 'text-cdaccent';

    const iconTone = tone === 'warn' ? 'text-orange-300' : tone === 'muted' ? 'text-cdaccent' : 'text-cdaccent';

    return (
        <div className={`mb-1.5 text-[10px] leading-snug ${toneClasses}`}>
            <div className="flex items-start gap-1 min-w-0">
                {Icon ? <Icon size={10} className={`shrink-0 mt-0.5 ${iconTone}`} aria-hidden /> : null}
                <p className="min-w-0 flex-1">
                    {open ? text : summary}
                </p>
                {needsExpand && (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-cdmuted hover:text-cdtext"
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
