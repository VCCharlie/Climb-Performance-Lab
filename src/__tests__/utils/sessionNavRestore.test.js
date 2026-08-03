import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    stashNavRestoreBeforeExternalNav,
    consumeNavRestore,
    persistMainTab,
    readPersistedMainTab,
    resolveInitialMainTab,
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
        stashNavRestoreBeforeExternalNav({ activeTab: 'activities', dataHubInternalTab: 'strava-profile' });
        const a = consumeNavRestore();
        expect(a).toEqual({ activeTab: 'activities', dataHubInternalTab: 'strava-profile' });
        expect(consumeNavRestore()).toBeNull();
    });

    it('persistMainTab survives session reads', () => {
        persistMainTab('activities');
        expect(readPersistedMainTab()).toBe('activities');
        expect(resolveInitialMainTab()).toBe('activities');
    });
});
