import React from 'react';
import { cn } from '../ui';
import NavTab from './NavTab';
import NavMoreMenu from './NavMoreMenu';
import { PRIMARY_NAV_TABS } from '../../config/navTabs';
import { prefetchMainTabChunk } from '../../utils/prefetchTabChunks';

/**
 * Primary app tabs (Dashboard, Activities, Training, Climbs) + More menu.
 * Used in the desktop header (lg+) and in the sticky main nav row (md–lg).
 */
export default function MainNavTabs({
    activeTab,
    onTabChange,
    className,
    variant = 'default',
}) {
    const isHeader = variant === 'header';

    return (
        <nav
            className={cn(
                'flex flex-wrap items-center min-w-0',
                isHeader ? 'justify-center gap-x-0 gap-y-0' : 'flex-1 gap-x-0.5 gap-y-0',
                className,
            )}
            role="tablist"
            aria-label="Main navigation"
        >
            {PRIMARY_NAV_TABS.map((item) => (
                <NavTab
                    key={item.id}
                    id={`main-tab-${item.id}`}
                    ariaControls={`main-tabpanel-${item.id}`}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    onPrefetch={() => prefetchMainTabChunk(item.id)}
                    variant={variant}
                />
            ))}
            <NavMoreMenu
                activeTab={activeTab}
                onTabChange={onTabChange}
                variant={variant}
            />
        </nav>
    );
}
