import React, { useEffect, useRef } from 'react';
import { cn } from '../ui';

const BASE_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'form', label: 'Form' },
    { id: 'power', label: 'Power' },
    { id: 'distance', label: 'Distance' },
    { id: 'volume', label: 'Volume' },
    { id: 'compare', label: 'Compare' },
];

const STRAVA_TAB = { id: 'strava', label: 'Strava', activeTextClass: 'text-orange-400' };

function tabButtonClass(isActive, activeTextClass = 'text-yellow-400') {
    return cn(
        'shrink-0 md:flex-1 md:min-w-[5.5rem] px-3 md:px-2 py-2 md:py-3',
        'text-xs md:text-sm font-bold whitespace-nowrap cd-focus-ring cd-transition',
        isActive
            ? cn('bg-cdborder', activeTextClass)
            : 'text-cdmuted hover:bg-cdborder/50',
    );
}

/**
 * Dashboard sub-tab strip — single horizontal scroll row on mobile, wrapped grid on desktop.
 */
export default function DashboardSubTabNav({
    activeTab,
    onTabChange,
    onTabIntent,
    onKeyDown,
    stravaConnected = false,
}) {
    const scrollRef = useRef(null);
    const activeButtonRef = useRef(null);

    const tabs = stravaConnected ? [...BASE_TABS, STRAVA_TAB] : BASE_TABS;

    useEffect(() => {
        const el = activeButtonRef.current;
        const container = scrollRef.current;
        if (!el || !container) return;

        const isMobile = typeof window.matchMedia === 'function'
            && window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        const targetLeft = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }, [activeTab]);

    return (
        <div
            ref={scrollRef}
            className={cn(
                'flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible',
                'border-b border-cdborder mb-4 -mx-1 px-1',
                'scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            )}
            role="tablist"
            aria-label="Dashboard Tabs"
            onKeyDown={onKeyDown}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const prefetch = tab.id !== 'overview' ? () => onTabIntent?.(tab.id) : undefined;

                return (
                    <button
                        key={tab.id}
                        ref={isActive ? activeButtonRef : null}
                        type="button"
                        id={`tab-${tab.id}`}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        onClick={() => onTabChange(tab.id)}
                        onMouseEnter={prefetch}
                        onFocus={prefetch}
                        className={tabButtonClass(isActive, tab.activeTextClass)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
