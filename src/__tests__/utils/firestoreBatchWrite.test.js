import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockBatchSet, mockBatchCommit, mockWriteBatch, mockDoc } = vi.hoisted(() => {
    const mockBatchSet = vi.fn();
    const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    const mockWriteBatch = vi.fn(() => ({
        set: mockBatchSet,
        commit: mockBatchCommit,
    }));
    const mockDoc = vi.fn((_, collection, id) => ({ collection, id }));
    return { mockBatchSet, mockBatchCommit, mockWriteBatch, mockDoc };
});

vi.mock('../../firebase', () => ({
    db: { name: 'test-db' },
}));

vi.mock('firebase/firestore', () => ({
    writeBatch: mockWriteBatch,
    doc: mockDoc,
}));

import {
    batchMergeWriteActivities,
    batchWriteDocuments,
    FIRESTORE_MAX_BATCH_SIZE,
} from '../../utils/firestoreBatchWrite';

describe('firestoreBatchWrite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exports Firestore batch size limit', () => {
        expect(FIRESTORE_MAX_BATCH_SIZE).toBe(500);
    });

    it('returns 0 for empty input', async () => {
        expect(await batchWriteDocuments('activities', [])).toBe(0);
    });

    it('commits one batch for a small write set', async () => {
        const written = await batchWriteDocuments('activities', [
            { id: 'a1', data: { title: 'Ride 1' } },
            { id: 'a2', data: { title: 'Ride 2' } },
        ]);

        expect(written).toBe(2);
        expect(mockWriteBatch).toHaveBeenCalledTimes(1);
        expect(mockBatchSet).toHaveBeenCalledTimes(2);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('splits writes across multiple batches when over the limit', async () => {
        const activities = Array.from({ length: FIRESTORE_MAX_BATCH_SIZE + 1 }, (_, i) => ({
            id: `id-${i}`,
            title: `Ride ${i}`,
        }));

        const written = await batchMergeWriteActivities(activities);

        expect(written).toBe(FIRESTORE_MAX_BATCH_SIZE + 1);
        expect(mockWriteBatch).toHaveBeenCalledTimes(2);
        expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });
});
