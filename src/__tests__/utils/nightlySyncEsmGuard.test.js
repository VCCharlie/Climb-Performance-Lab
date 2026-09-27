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
});
