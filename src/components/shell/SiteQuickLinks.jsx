import React from 'react';
import { ExternalLink } from 'lucide-react';

const QUICK_LINKS = [
    {
        id: 'cycling-pack',
        label: 'Cycling Pack',
        href: 'https://github.com/VCCharlie/Bike-clothing-list',
    },
    {
        id: 'squadrats',
        label: 'Squadrats',
        href: 'https://squadrats.com/expeditions',
    },
    {
        id: 'wandrer',
        label: 'Wandrer',
        href: 'https://wandrer.earth/dashboard',
    },
];

/**
 * Subtle external shortcuts shown at the top of the app shell.
 */
export default function SiteQuickLinks() {
    return (
        <nav
            className="border-b border-cdborder/25 bg-cdsurface/40"
            aria-label="Related tools"
        >
            <div className="max-w-7xl mx-auto px-3 py-1 flex items-center justify-center sm:justify-end gap-1 sm:gap-2">
                {QUICK_LINKS.map((link, index) => (
                    <React.Fragment key={link.id}>
                        {index > 0 && (
                            <span className="text-cdborder/60 select-none" aria-hidden>·</span>
                        )}
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-cdmuted hover:text-cdaccent transition-colors"
                        >
                            {link.label}
                            <ExternalLink size={10} className="opacity-50" aria-hidden />
                        </a>
                    </React.Fragment>
                ))}
            </div>
        </nav>
    );
}
