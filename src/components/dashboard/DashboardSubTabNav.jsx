import React from 'react';
import SubTabNav from '../ui/SubTabNav';

const BASE_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'form', label: 'Form' },
    { id: 'power', label: 'Power' },
    { id: 'distance', label: 'Distance' },
    { id: 'volume', label: 'Volume' },
    { id: 'compare', label: 'Compare' },
];

const STRAVA_TAB = { id: 'strava', label: 'Strava' };

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
    const tabs = stravaConnected ? [...BASE_TABS, STRAVA_TAB] : BASE_TABS;

    return (
        <SubTabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onTabIntent={onTabIntent}
            onKeyDown={onKeyDown}
            ariaLabel="Dashboard Tabs"
            idPrefix="tab"
            tabPanelIdPrefix="tabpanel"
        />
    );
}
