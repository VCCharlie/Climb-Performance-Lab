import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveStravaGearDisplay } from '../../utils/stravaBikesLocalMap';

describe('resolveStravaGearDisplay', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => JSON.stringify({ b999: '🧡' })),
        });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses cached name when gear_name is raw Strava id', () => {
        const r = resolveStravaGearDisplay('b999', 'b999');
        expect(r.display).toBe('🧡');
        expect(r.title).toContain('b999');
    });

    it('shows stored name when not a placeholder', () => {
        const r = resolveStravaGearDisplay('b1', 'My bike');
        expect(r.display).toBe('My bike');
    });
});
