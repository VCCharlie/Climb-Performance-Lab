import { describe, expect, it, vi } from 'vitest';
import { persistImportedActivitiesReplacingDuplicates } from '../../utils/importPersistence';

describe('persistImportedActivitiesReplacingDuplicates', () => {
    it('writes imported replacements before deleting duplicate rows', async () => {
        const calls = [];
        const incoming = { id: 'i2', date: '2026-05-01', title: 'Intervals row' };
        const existing = { id: 'i2', strava_id: '123', gear_id: 'b1' };

        await persistImportedActivitiesReplacingDuplicates({
            activities: [existing],
            toImport: [incoming],
            idsToDelete: ['strava_123'],
            writeActivity: vi.fn(async (id, payload) => {
                calls.push(['write', id, payload]);
            }),
            deleteActivity: vi.fn(async (id) => {
                calls.push(['delete', id]);
            }),
            mergePayload: (next, prev) => ({ ...prev, ...next }),
        });

        expect(calls).toEqual([
            ['write', 'i2', { id: 'i2', strava_id: '123', gear_id: 'b1', date: '2026-05-01', title: 'Intervals row' }],
            ['delete', 'strava_123'],
        ]);
    });

    it('does not delete duplicate rows when a replacement write fails', async () => {
        const deleteActivity = vi.fn();

        await expect(
            persistImportedActivitiesReplacingDuplicates({
                toImport: [{ id: 'i2', title: 'Replacement' }],
                idsToDelete: ['strava_123'],
                writeActivity: vi.fn(async () => {
                    throw new Error('network down');
                }),
                deleteActivity,
            }),
        ).rejects.toThrow('network down');

        expect(deleteActivity).not.toHaveBeenCalled();
    });
});
