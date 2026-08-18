import React, { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../ui';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import { MORE_NAV_TABS, isMoreNavTab } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

/**
 * Desktop "More" menu — secondary tabs (Race, Gear, Profiler, …) aligned with mobile bottom nav.
 */
export default function NavMoreMenu({ activeTab, onTabChange }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const moreIsActive = isMoreNavTab(activeTab);

    return (
        <div className={cn('relative shrink-0', open && 'z-[60]')}>
            <button
                ref={buttonRef}
                type="button"
                role="tab"
                aria-selected={moreIsActive}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap',
                    'rounded-t-cdmd cd-transition cd-focus-ring',
                    moreIsActive || open
                        ? 'text-cdtext'
                        : 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow/80',
                )}
            >
                <MoreHorizontal
                    className={cn('w-4 h-4 shrink-0', (moreIsActive || open) && 'text-cdprimary')}
                    aria-hidden
                />
                More
                {moreIsActive && (
                    <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-cdprimary"
                        aria-hidden
                    />
                )}
            </button>
            <AnchoredDropdownPortal
                open={open}
                anchorRef={buttonRef}
                onClose={() => setOpen(false)}
                minWidth={220}
            >
                {MORE_NAV_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                onTabChange(tab.id);
                                setOpen(false);
                            }}
                            onMouseEnter={() => prefetchMainTabChunk(tab.id)}
                            onFocus={() => prefetchMainTabChunk(tab.id)}
                            className={cn(
                                'w-full flex items-center gap-2 px-4 py-2.5 text-sm cd-transition cd-focus-ring',
                                isActive
                                    ? 'bg-cdprimarycontainer text-cdonprimarycontainer'
                                    : 'text-cdtext hover:bg-cdborder/40',
                            )}
                        >
                            <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-cdprimary')} aria-hidden />
                            {tab.label}
                        </button>
                    );
                })}
            </AnchoredDropdownPortal>
        </div>
    );
}
