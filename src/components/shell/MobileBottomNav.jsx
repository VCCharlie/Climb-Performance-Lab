import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../ui';
import { MAIN_NAV_TABS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

const BOTTOM_NAV_IDS = new Set(['dashboard', 'activities', 'training', 'physics']);

const BOTTOM_NAV_TABS = MAIN_NAV_TABS.filter((tab) => BOTTOM_NAV_IDS.has(tab.id));

const MORE_TABS = MAIN_NAV_TABS.filter((tab) => !BOTTOM_NAV_IDS.has(tab.id));

/**
 * Mobile bottom navigation — four primary tabs plus a "More" menu for the rest.
 */
function MobileBottomNav({ activeTab, onTabChange }) {
    const [moreOpen, setMoreOpen] = useState(false);

    const handlePrefetch = useCallback((tabId) => {
        prefetchMainTabChunk(tabId);
    }, []);

    const moreIsActive = MORE_TABS.some((tab) => tab.id === activeTab);

    const selectTab = (tabId) => {
        onTabChange(tabId);
        setMoreOpen(false);
    };

    return (
        <>
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-50 w-full max-w-[100vw] overflow-hidden border-t border-cdborder bg-cdsurface/95 backdrop-blur-md supports-[backdrop-filter]:bg-cdsurface/90"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                aria-label="Primary navigation"
            >
                <ul className="flex items-stretch justify-around max-w-lg mx-auto">
                    {BOTTOM_NAV_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <li key={tab.id} className="flex-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => selectTab(tab.id)}
                                    onPointerDown={() => handlePrefetch(tab.id)}
                                    onFocus={() => handlePrefetch(tab.id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-14 cd-focus-ring cd-transition',
                                        isActive ? 'text-cdprimary' : 'text-cdmuted hover:text-cdtext',
                                    )}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                                    <span className="text-[10px] font-semibold truncate max-w-full">{tab.label}</span>
                                </button>
                            </li>
                        );
                    })}
                    <li className="flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setMoreOpen((open) => !open)}
                            aria-expanded={moreOpen}
                            aria-haspopup="true"
                            aria-label="More sections"
                            className={cn(
                                'w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-14 cd-focus-ring cd-transition',
                                moreOpen || moreIsActive ? 'text-cdprimary' : 'text-cdmuted hover:text-cdtext',
                            )}
                        >
                            <MoreHorizontal size={20} strokeWidth={moreOpen || moreIsActive ? 2.5 : 2} aria-hidden />
                            <span className="text-[10px] font-semibold truncate max-w-full">More</span>
                        </button>
                    </li>
                </ul>
            </nav>

            {moreOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <button
                        type="button"
                        className="md:hidden fixed inset-0 z-[45] bg-cdscrim cd-transition"
                        aria-label="Close more menu"
                        onClick={() => setMoreOpen(false)}
                    />
                    <div
                        className="md:hidden fixed inset-x-2 z-[46] rounded-cdxl border border-cdborder/60 bg-cdsurface shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden"
                        style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}
                        role="menu"
                        aria-label="More navigation"
                    >
                        <ul className="grid grid-cols-2 py-1">
                            {MORE_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <li key={tab.id}>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => selectTab(tab.id)}
                                            onPointerDown={() => handlePrefetch(tab.id)}
                                            onFocus={() => handlePrefetch(tab.id)}
                                            className={cn(
                                                'w-full flex items-center gap-2.5 px-3 min-h-11 py-2.5 text-sm font-medium cd-transition cd-focus-ring',
                                                isActive
                                                    ? 'bg-cdprimarycontainer text-cdonprimarycontainer'
                                                    : 'text-cdtext hover:bg-cdsurfacelow active:bg-cdsurfacehigh',
                                            )}
                                        >
                                            <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-cdprimary')} aria-hidden />
                                            <span className="truncate">{tab.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </>,
                document.body,
            )}
        </>
    );
}

export default React.memo(MobileBottomNav);
