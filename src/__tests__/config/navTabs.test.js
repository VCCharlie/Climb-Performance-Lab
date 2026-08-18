import { describe, it, expect } from 'vitest';
import {
    MAIN_NAV_TABS,
    PRIMARY_NAV_TABS,
    MORE_NAV_TABS,
    PRIMARY_NAV_TAB_IDS,
    isMoreNavTab,
} from '../../config/navTabs';

describe('navTabs hub split', () => {
    it('defines four primary hubs aligned with mobile bottom nav', () => {
        expect(PRIMARY_NAV_TABS.map((t) => t.id)).toEqual([
            'dashboard',
            'activities',
            'training',
            'physics',
        ]);
    });

    it('places secondary sections in More menu', () => {
        expect(MORE_NAV_TABS.map((t) => t.id)).toEqual([
            'race',
            'gearoptimizer',
            'profiler',
            'bucketlist',
            'climbmap',
            'weather',
        ]);
    });

    it('covers all main tabs without overlap', () => {
        const primaryIds = new Set(PRIMARY_NAV_TABS.map((t) => t.id));
        const moreIds = new Set(MORE_NAV_TABS.map((t) => t.id));
        expect(primaryIds.size + moreIds.size).toBe(MAIN_NAV_TABS.length);
        for (const tab of MAIN_NAV_TABS) {
            expect(primaryIds.has(tab.id) || moreIds.has(tab.id)).toBe(true);
        }
    });

    it('isMoreNavTab identifies secondary tabs only', () => {
        expect(isMoreNavTab('race')).toBe(true);
        expect(isMoreNavTab('dashboard')).toBe(false);
        expect(PRIMARY_NAV_TAB_IDS.has('physics')).toBe(true);
    });
});
