import { describe, expect, it, vi } from 'vitest';

const writeCalls = [];

vi.mock('../../utils/firestoreBatchWrite', () => ({
    batchWriteDocuments: vi.fn(async (_collection, entries) => {
        for (const { id, data } of entries) {
            writeCalls.push(['write', id, data]);
        }
        return entries.length;
    }),
}));

import {
    persistImportedActivitiesReplacingDuplicates,
    prepareImportedActivitiesForDuplicateReplacement,
} from '../../utils/importPersistence';
import { mergeActivitiesIntervalsPrimary } from '../../utils/mergeActivities';

describe('persistImportedActivitiesReplacingDuplicates', () => {
    it('writes imported replacements before deleting duplicate rows', async () => {
        writeCalls.length = 0;
        const incoming = { id: 'i2', date: '2026-05-01', title: 'Intervals row' };
        const existing = { id: 'i2', strava_id: '123', gear_id: 'b1' };

        await persistImportedActivitiesReplacingDuplicates({
            activities: [existing],
            toImport: [incoming],
            idsToDelete: ['strava_123'],
            writeActivity: vi.fn(),
            deleteActivity: vi.fn(async (id) => {
                writeCalls.push(['delete', id]);
            }),
            mergePayload: (next, prev) => ({ ...prev, ...next }),
        });

        expect(writeCalls).toEqual([
            ['write', 'i2', { id: 'i2', strava_id: '123', gear_id: 'b1', date: '2026-05-01', title: 'Intervals row' }],
            ['delete', 'strava_123'],
        ]);
    });

    it('does not delete duplicate rows when a replacement write fails', async () => {
        const deleteActivity = vi.fn();
        const { batchWriteDocuments } = await import('../../utils/firestoreBatchWrite');
        batchWriteDocuments.mockRejectedValueOnce(new Error('network down'));

        await expect(
            persistImportedActivitiesReplacingDuplicates({
                toImport: [{ id: 'i2', title: 'Replacement' }],
                idsToDelete: ['strava_123'],
                writeActivity: vi.fn(),
                deleteActivity,
            }),
        ).rejects.toThrow('network down');

        expect(deleteActivity).not.toHaveBeenCalled();
    });

    it('merges enrichment from the duplicate row before replacing its id', () => {
        const existingStravaRow = {
            id: 'strava_123',
            strava_id: '123',
            date: '2026-05-01',
            type: 'Ride',
            title: 'Evening club climb',
            distance: 42.1,
            moving_time: '1:30:00',
            strava_map: 'encoded-route',
            gear_id: 'bike-1',
            gear_name: 'Race Bike',
            avg_hr: 151,
            strava_kom_summary: { label: 'PR · KOM#2' },
        };
        const incomingIntervalsRow = {
            id: '987654321',
            strava_id: '123',
            date: '2026-05-01',
            type: 'Ride',
            title: 'Morning Ride',
            distance: 42.2,
            moving_time: 5420,
            norm_power: 255,
            avg_power: 241,
            load: 86,
        };

        const result = prepareImportedActivitiesForDuplicateReplacement({
            activities: [existingStravaRow],
            toImport: [incomingIntervalsRow],
            findDuplicate: vi.fn(() => existingStravaRow),
            mergeDuplicate: mergeActivitiesIntervalsPrimary,
        });

        expect(result.idsToDelete).toEqual(['strava_123']);
        expect(result.replacedCount).toBe(1);
        expect(result.preparedImport).toEqual([
            expect.objectContaining({
                id: '987654321',
                strava_id: '123',
                title: 'Evening club climb',
                strava_map: 'encoded-route',
                gear_id: 'bike-1',
                gear_name: 'Race Bike',
                avg_hr: 151,
                norm_power: 255,
                avg_power: 241,
                load: 86,
            }),
        ]);
    });
});
