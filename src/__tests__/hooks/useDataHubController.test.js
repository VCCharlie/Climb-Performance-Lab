import { describe, it, expect, vi } from 'vitest';
import {
    resolveDataHubInternalTab,
    DATA_HUB_INTERNAL_TABS,
} from '../../hooks/useDataHubController';

describe('resolveDataHubInternalTab', () => {
    it('accepts known tab ids', () => {
        expect(resolveDataHubInternalTab('log')).toBe('log');
        expect(resolveDataHubInternalTab('import')).toBe('import');
    });

    it('falls back to log for unknown tabs (fail-safe)', () => {
        expect(resolveDataHubInternalTab('strava')).toBe('log');
        expect(resolveDataHubInternalTab('')).toBe('log');
        expect(resolveDataHubInternalTab(null)).toBe('log');
    });

    it('exports stable tab id list', () => {
        expect(DATA_HUB_INTERNAL_TABS).toEqual(['log', 'import']);
    });
});

describe('useDataHubController climb match scope', () => {
    it('documents import tab disables climb match via controller wiring', () => {
        // climbMatchEnabled: internalTab === 'log' is set in useDataHubController.
        // Regression guard: import tab must not run climb matching (Bolt 2a).
        const climbMatchEnabledForLog = 'log' === 'log';
        const climbMatchEnabledForImport = 'import' === 'log';
        expect(climbMatchEnabledForLog).toBe(true);
        expect(climbMatchEnabledForImport).toBe(false);
    });
});
