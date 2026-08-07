import React from 'react';
import {
    ExternalLink,
    Package,
    Map,
    Globe,
    Bike,
    Mountain,
    Link2,
    Github,
    Flag,
    Compass,
    Activity,
} from 'lucide-react';
import { resolveQuickLinks } from '../../utils/quickLinks';

const ICON_MAP = {
    package: Package,
    map: Map,
    globe: Globe,
    bike: Bike,
    mountain: Mountain,
    link: Link2,
    github: Github,
    flag: Flag,
    compass: Compass,
    activity: Activity,
};

/**
 * Configurable external shortcuts in the site banner.
 * @param {{ userSettings?: object, iconOnly?: boolean }} props
 */
export default function SiteQuickLinks({ userSettings, iconOnly = false }) {
    const links = resolveQuickLinks(userSettings);
    if (!links.length) return null;

    return (
        <nav
            className="hidden md:block border-b border-cdborder/25 bg-cdsurface/40"
            aria-label="Quick links"
        >
            <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
                {links.map((link) => {
                    const IconComponent = ICON_MAP[link.icon] || Link2;
                    return (
                        <a
                            key={link.id}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.label}
                            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-cdmuted hover:text-cdaccent transition-colors rounded-md px-1.5 py-0.5 hover:bg-cdborder/20"
                        >
                            <IconComponent size={13} className="shrink-0 opacity-80" aria-hidden />
                            {!iconOnly ? (
                                <>
                                    <span>{link.label}</span>
                                    <ExternalLink size={9} className="opacity-40" aria-hidden />
                                </>
                            ) : (
                                <span className="sr-only">{link.label}</span>
                            )}
                        </a>
                    );
                })}
            </div>
        </nav>
    );
}
