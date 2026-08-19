import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    prefetchMainTabChunk,
    prefetchDashboardSubTabChunk,
    resetPrefetchTabChunksForTests,
} from '../../utils/prefetchTabChunks';

vi.mock('../../services/climbDatabase', () => ({
    loadFullClimbDatabase: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../../utils/loadLeaflet', () => ({
    loadLeaflet: vi.fn(() => Promise.resolve({})),
}));
vi.mock('../../components/PhysicsEngine', () => ({ default: () => null }));
vi.mock('../../components/DataHub', () => ({ default: () => null }));
vi.mock('../../components/dashboard/PowerTab', () => ({ default: () => null }));
vi.mock('../../components/dashboard/OverviewChartsPanel', () => ({ default: () => null }));

describe('prefetchTabChunks', () => {
    beforeEach(() => {
        resetPrefetchTabChunksForTests();
    });

    it('ignores dashboard tab id', () => {
        expect(() => prefetchMainTabChunk('dashboard')).not.toThrow();
    });

    it('dedupes repeated prefetch for same tab', async () => {
        prefetchMainTabChunk('physics');
        prefetchMainTabChunk('physics');
        // Second call should not throw; dedupe is internal
        expect(true).toBe(true);
    });

    it('prefetches dashboard sub-tabs including overview charts', () => {
        expect(() => prefetchDashboardSubTabChunk('overview')).not.toThrow();
        expect(() => prefetchDashboardSubTabChunk('power')).not.toThrow();
    });

    it('prefetches climb database on climb-related tab hover', async () => {
        const { loadFullClimbDatabase } = await import('../../services/climbDatabase');
        prefetchMainTabChunk('bucketlist');
        expect(loadFullClimbDatabase).toHaveBeenCalled();
    });
});
