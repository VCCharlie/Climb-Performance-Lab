import React, { useEffect, useRef } from 'react';
import { cn } from './cn';
import { cdTypeSubsection } from '../../utils/typography';

/** Active sub-tab text — use cdprimary (theme accent), not hardcoded yellow. */
export const SUB_TAB_ACTIVE_TEXT_CLASS = 'text-cdprimary';

/**
 * Shared sub-tab strip: horizontal scroll on mobile, equal-width row on desktop.
 */
export function subTabButtonClass(isActive, activeTextClass = SUB_TAB_ACTIVE_TEXT_CLASS, density = 'default') {
    const isCompact = density === 'compact';
    return cn(
        'shrink-0 md:flex-1 whitespace-nowrap cd-focus-ring cd-transition',
        isCompact
            ? 'min-w-[4.5rem] md:min-w-[4rem] px-3 md:px-2 py-2 md:py-1.5 cd-min-touch-y'
            : 'md:min-w-[5.5rem] px-3 md:px-2 py-2 md:py-3',
        cdTypeSubsection,
        'normal-case tracking-normal font-bold',
        isCompact ? 'md:text-xs' : 'md:text-sm',
        isActive
            ? cn('bg-cdborder', activeTextClass)
            : 'text-cdmuted hover:bg-cdborder/50',
    );
}

/**
 * @param {object} props
 * @param {Array<{
 *   id: string,
 *   label: string,
 *   mobileLabel?: string,
 *   icon?: React.ComponentType<{ className?: string, size?: number, 'aria-hidden'?: boolean }>,
 *   activeTextClass?: string,
 *   ariaControls?: string,
 * }>} props.tabs
 */
export default function SubTabNav({
    tabs,
    activeTab,
    onTabChange,
    onTabIntent,
    onKeyDown,
    ariaLabel,
    idPrefix = 'tab',
    tabPanelIdPrefix = 'tabpanel',
    layout = 'scroll',
    density = 'default',
    buttonClassName,
}) {
    const scrollRef = useRef(null);
    const activeButtonRef = useRef(null);

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

    const containerClass = cn(
        layout === 'equal'
            ? 'flex border-b border-cdborder mb-4'
            : cn(
                'flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible',
                'border-b border-cdborder mb-4 -mx-1 px-1',
                'scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            ),
    );

    return (
        <div
            ref={scrollRef}
            className={containerClass}
            role="tablist"
            aria-label={ariaLabel}
            onKeyDown={onKeyDown}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const prefetch = onTabIntent && tab.id !== tabs[0]?.id
                    ? () => onTabIntent(tab.id)
                    : undefined;
                const Icon = tab.icon;
                const panelId = tab.ariaControls ?? `${tabPanelIdPrefix}-${tab.id}`;

                return (
                    <button
                        key={tab.id}
                        ref={isActive ? activeButtonRef : null}
                        type="button"
                        id={`${idPrefix}-${tab.id}`}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={panelId}
                        onClick={() => onTabChange(tab.id)}
                        onMouseEnter={prefetch}
                        onFocus={prefetch}
                        className={cn(
                            subTabButtonClass(isActive, tab.activeTextClass, density),
                            layout === 'equal' && 'flex-1 py-3',
                            buttonClassName,
                        )}
                    >
                        {Icon ? (
                            <span className="inline-flex items-center justify-center gap-1.5">
                                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                                <span className="md:hidden">{tab.mobileLabel ?? tab.label}</span>
                                <span className="hidden md:inline">{tab.label}</span>
                            </span>
                        ) : (
                            tab.label
                        )}
                    </button>
                );
            })}
        </div>
    );
}
