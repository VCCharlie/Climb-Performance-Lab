import {
    Gauge,
    Mountain,
    Activity,
    Brain,
    Route,
    Settings,
    TrendingUp,
    Trophy,
    Cloud,
    Map as MapIcon,
} from 'lucide-react';

/** Shared time-range presets for dashboard filtering. */
export const TIME_RANGE_OPTIONS = ['1M', '3M', '6M', '1Y', '3Y', '6Y', 'ALL', 'Custom'];

/** Main tabs where the global time-range filter affects displayed data. */
export const TIME_RANGE_TAB_IDS = new Set(['dashboard', 'activities', 'training']);

/** Tabs that show the quick “sync today from Intervals.icu” header button (mobile + Activities desktop). */
export const INTERVALS_QUICK_SYNC_TAB_IDS = new Set(['dashboard', 'activities']);

/** Primary app navigation tabs (10 main sections). */
export const MAIN_NAV_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'training', label: 'Training', icon: Brain },
    { id: 'physics', label: 'Climbs', icon: Mountain },
    { id: 'race', label: 'Race', icon: Route },
    { id: 'gearoptimizer', label: 'Gear', icon: Settings },
    { id: 'profiler', label: 'Profiler', icon: TrendingUp },
    { id: 'bucketlist', label: 'Bucket List', icon: Trophy },
    { id: 'climbmap', label: 'Map', icon: MapIcon },
    { id: 'weather', label: 'Weather', icon: Cloud },
];

/** Bottom bar + desktop header: four primary hubs (matches mobile muscle memory). */
export const PRIMARY_NAV_TAB_IDS = new Set(['dashboard', 'activities', 'training', 'physics']);

export const PRIMARY_NAV_TABS = MAIN_NAV_TABS.filter((tab) => PRIMARY_NAV_TAB_IDS.has(tab.id));

export const MORE_NAV_TABS = MAIN_NAV_TABS.filter((tab) => !PRIMARY_NAV_TAB_IDS.has(tab.id));

export function isMoreNavTab(tabId) {
    return MORE_NAV_TABS.some((tab) => tab.id === tabId);
}
