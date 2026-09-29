import { describe, it, expect } from 'vitest';
import { verifyNightlySyncEsmImports } from '../../utils/nightlySyncEsmGuard.js';

describe('nightlySyncEsmGuard', () => {
    it('nightlySync.js dependency chain uses explicit .js extensions', () => {
        const result = verifyNightlySyncEsmImports();
        if (!result.ok) {
            expect(result.errors).toEqual([]);
        }
        expect(result.ok).toBe(true);
    });

    it('nightlySync.js does not pull Firebase client SDK (Node-safe chain)', () => {
        const result = verifyNightlySyncEsmImports();
        expect(result.ok).toBe(true);
        const chainNote = result.ok ? 'ok' : result.errors.join('\n');
        expect(chainNote).not.toContain('firebase.js');
    });
});
