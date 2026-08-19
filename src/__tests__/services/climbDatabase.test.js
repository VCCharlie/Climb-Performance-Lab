import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CORE_CLIMB_DATABASE, buildFullClimbDatabase } from '../../climbs';
import {
    getCoreClimbDatabase,
    loadFullClimbDatabase,
    isFullClimbDatabaseLoaded,
    getDefaultClimb,
    resetClimbDatabaseCacheForTests,
} from '../../services/climbDatabase';

describe('climbDatabase service', () => {
    beforeEach(() => {
        vi.resetModules();
        resetClimbDatabaseCacheForTests();
    });

    it('exposes core climbs synchronously', () => {
        expect(getCoreClimbDatabase().length).toBe(CORE_CLIMB_DATABASE.length);
        expect(getDefaultClimb().id).toBe(CORE_CLIMB_DATABASE[0].id);
    });

    it('buildFullClimbDatabase merges extended with Zwift extras', () => {
        const merged = buildFullClimbDatabase([
            { id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR', lengthKm: 13.8, elevation: 1061, avgGrade: 8.1 },
        ]);
        expect(merged.some((c) => c.id === 'fr_alpe')).toBe(true);
        expect(merged.some((c) => c.id === 'zw_alpe')).toBe(true);
        expect(merged.length).toBeGreaterThan(CORE_CLIMB_DATABASE.length);
    });

    it('loadFullClimbDatabase dynamic import resolves full list', async () => {
        const full = await loadFullClimbDatabase();
        expect(isFullClimbDatabaseLoaded()).toBe(true);
        expect(full.length).toBeGreaterThan(1000);
    });

    it('concurrent loadFullClimbDatabase callers share one full result', async () => {
        const [a, b] = await Promise.all([loadFullClimbDatabase(), loadFullClimbDatabase()]);
        expect(a).toBe(b);
        expect(a.length).toBeGreaterThan(CORE_CLIMB_DATABASE.length);
        expect(a.some((c) => c.country && c.country !== 'ZWIFT')).toBe(true);
    });
});
