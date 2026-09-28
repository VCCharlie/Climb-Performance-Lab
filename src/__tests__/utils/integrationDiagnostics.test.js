import { describe, it, expect, beforeEach } from 'vitest';
import { buildIntegrationDiagnosticsLines } from '../../utils/integrationDiagnostics.js';

describe('integrationDiagnostics', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reports direct API route when local credentials exist', () => {
        const lines = buildIntegrationDiagnosticsLines({
            intervalsConfig: { athleteId: 'i123', apiKey: 'secret' },
            stravaConfig: {},
            isSignedIn: true,
        });
        const route = lines.find((l) => l.label === 'Intervals sync route');
        expect(route?.value).toContain('Direct browser API');
        expect(route?.tone).toBe('ok');
    });

    it('reports cloud route when signed in without local key', () => {
        const lines = buildIntegrationDiagnosticsLines({
            intervalsConfig: { athleteId: 'i123', apiKey: '' },
            stravaConfig: { connected: true, athleteId: '999' },
            isSignedIn: true,
        });
        const route = lines.find((l) => l.label === 'Intervals sync route');
        expect(route?.value).toContain('Cloud sync');
    });

    it('does not expose API key value', () => {
        const lines = buildIntegrationDiagnosticsLines({
            intervalsConfig: { athleteId: 'i1', apiKey: 'my-secret-key' },
            stravaConfig: {},
            isSignedIn: true,
        });
        const keyLine = lines.find((l) => l.label.includes('API key'));
        expect(keyLine?.value).not.toContain('my-secret-key');
    });
});
