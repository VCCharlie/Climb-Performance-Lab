import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    stashNavRestoreBeforeExternalNav,
    consumeNavRestore,
    persistMainTab,
    readPersistedMainTab,
    resolveInitialMainTab,
    resolveInitialDashboardSubTab,
} from '../../utils/sessionNavRestore';

describe('sessionNavRestore', () => {
    const store = {};

    beforeEach(() => {
        vi.stubGlobal('sessionStorage', {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Object.keys(store).forEach((k) => delete store[k]);
    });

    it('stash then consume returns payload once', () => {
        stashNavRestoreBeforeExternalNav({ activeTab: 'dashboard', dashboardSubTab: 'strava' });
        const a = consumeNavRestore();
        expect(a).toEqual({ activeTab: 'dashboard', dashboardSubTab: 'strava' });
        expect(consumeNavRestore()).toBeNull();
    });

    it('resolveInitialDashboardSubTab maps legacy strava-profile restore to dashboard strava', () => {
        stashNavRestoreBeforeExternalNav({ activeTab: 'activities', dataHubInternalTab: 'strava-profile' });
        expect(resolveInitialDashboardSubTab()).toBe('strava');
    });

    it('persistMainTab survives session reads', () => {
        persistMainTab('activities');
        expect(readPersistedMainTab()).toBe('activities');
        expect(resolveInitialMainTab()).toBe('activities');
    });
});
