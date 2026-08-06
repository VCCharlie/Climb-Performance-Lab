import React, { useCallback } from 'react';
import { Gauge, Activity, Brain, Mountain } from 'lucide-react';
import { cn } from '../ui';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

const BOTTOM_NAV_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'training', label: 'Training', icon: Brain },
    { id: 'physics', label: 'Climbs', icon: Mountain },
];

/**
 * Mobile bottom navigation for the four most-used tabs (md and up uses MainNav).
 */
function MobileBottomNav({ activeTab, onTabChange }) {
    const handlePrefetch = useCallback((tabId) => {
        prefetchMainTabChunk(tabId);
    }, []);

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-cdborder bg-cdsurface/95 backdrop-blur-md supports-[backdrop-filter]:bg-cdsurface/90"
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
                                onClick={() => onTabChange(tab.id)}
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
            </ul>
        </nav>
    );
}

export default React.memo(MobileBottomNav);
