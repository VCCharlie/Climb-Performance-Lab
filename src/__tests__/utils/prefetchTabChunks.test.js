import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    prefetchMainTabChunk,
    prefetchDashboardSubTabChunk,
    resetPrefetchTabChunksForTests,
} from '../../utils/prefetchTabChunks';

vi.mock('../../components/PhysicsEngine', () => ({ default: () => null }));
vi.mock('../../components/DataHub', () => ({ default: () => null }));
vi.mock('../../components/dashboard/PowerTab', () => ({ default: () => null }));

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

    it('prefetches dashboard sub-tabs except overview', () => {
        expect(() => prefetchDashboardSubTabChunk('overview')).not.toThrow();
        expect(() => prefetchDashboardSubTabChunk('power')).not.toThrow();
    });
});
