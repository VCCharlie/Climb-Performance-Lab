import React, { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../ui';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import { MORE_NAV_TABS, isMoreNavTab } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

/**
 * Desktop "More" menu — secondary tabs (Race, Gear, Profiler, …) aligned with mobile bottom nav.
 */
export default function NavMoreMenu({ activeTab, onTabChange, variant = 'default' }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const moreIsActive = isMoreNavTab(activeTab);
    const isHeader = variant === 'header';

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
                    'relative flex items-center whitespace-nowrap rounded-t-cdmd cd-transition cd-focus-ring',
                    isHeader
                        ? 'gap-1 px-2 py-1.5 lg:px-2.5 text-[11px] lg:text-xs font-semibold'
                        : 'gap-1.5 px-3 py-2.5 text-xs font-semibold',
                    moreIsActive || open
                        ? 'text-cdtext'
                        : 'text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow/80',
                )}
            >
                <MoreHorizontal
                    className={cn(
                        'shrink-0',
                        isHeader ? 'w-3.5 h-3.5 lg:w-4 lg:h-4' : 'w-4 h-4',
                        (moreIsActive || open) && 'text-cdprimary',
                    )}
                    aria-hidden
                />
                More
                {moreIsActive && (
                    <span
                        className={cn(
                            'absolute bottom-0 h-0.5 rounded-full bg-cdprimary',
                            isHeader ? 'left-2 right-2 lg:left-2.5 lg:right-2.5' : 'left-3 right-3',
                        )}
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
