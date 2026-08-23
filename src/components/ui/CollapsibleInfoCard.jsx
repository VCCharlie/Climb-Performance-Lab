import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';

const VARIANT_STYLES = {
    info: {
        shell: 'bg-blue-500/10 border-blue-500/30',
        title: 'text-blue-400',
        icon: 'text-blue-400',
    },
    accent: {
        shell: 'bg-cdaccent/10 border-cdaccent/30',
        title: 'text-cdaccent',
        icon: 'text-cdaccent',
    },
    primary: {
        shell: 'bg-cdprimary/10 border-cdprimary/30',
        title: 'text-cdprimary',
        icon: 'text-cdprimary',
    },
    default: {
        shell: 'bg-cdbg/40 border-cdborder/60',
        title: 'text-cdtext',
        icon: 'text-cdaccent',
    },
};

/**
 * Collapsible explanatory info panel — chevron aligned top-right (Dashboard + Training).
 */
export default function CollapsibleInfoCard({
    title,
    subtitle,
    icon: Icon = Info,
    variant = 'info',
    defaultExpanded = true,
    collapseOnMobile = false,
    children,
    className = '',
    bodyClassName = '',
}) {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const initialExpanded = collapseOnMobile && isMobile ? false : defaultExpanded;
    const [expanded, setExpanded] = useState(initialExpanded);

    const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

    return (
        <div className={`rounded-lg border ${styles.shell} ${className}`}>
            <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                className="w-full px-4 py-3 text-left hover:bg-cdborder/10 cd-transition cd-focus-ring"
                aria-expanded={expanded}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold flex items-center gap-2 ${styles.title}`}>
                            <Icon size={16} className={`shrink-0 ${styles.icon}`} aria-hidden />
                            <span className="min-w-0">{title}</span>
                        </div>
                        {subtitle ? (
                            <p className="text-xs text-cdmuted mt-1 leading-relaxed">{subtitle}</p>
                        ) : null}
                    </div>
                    <div className="shrink-0 text-cdmuted self-start pt-0.5" aria-hidden>
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                </div>
            </button>

            {expanded ? (
                <div className={`px-4 pb-4 text-sm text-cdtext leading-relaxed space-y-2 ${bodyClassName}`}>
                    {children}
                </div>
            ) : null}
        </div>
    );
}
