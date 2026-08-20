import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/decouplingStreamEnrich', () => ({
    enrichActivitiesWithDecoupling: vi.fn(),
}));

import { enrichActivitiesWithDecoupling } from '../../utils/decouplingStreamEnrich';
import { enrichSyncedActivitiesDrift, formatSyncDriftRemainderNote } from '../../utils/syncDriftEnrich';

describe('syncDriftEnrich', () => {
    beforeEach(() => {
        enrichActivitiesWithDecoupling.mockReset();
    });

    it('returns zero when FTP is missing', async () => {
        const result = await enrichSyncedActivitiesDrift([{ id: '1' }], { profileFtp: 0 });
        expect(result.enrichedCount).toBe(0);
        expect(enrichActivitiesWithDecoupling).not.toHaveBeenCalled();
    });

  it('counts newly analyzed rides only', async () => {
    enrichActivitiesWithDecoupling.mockResolvedValue([
      { id: '1', threshold_drift_pct: 5.2, threshold_drift_status: 'moderate' },
      { id: '2', decoupling_pct: 3.1, decoupling_status: 'good' },
    ]);

    const result = await enrichSyncedActivitiesDrift(
      [{ id: '1', type: 'Ride' }, { id: '2', type: 'Ride', decoupling_pct: 3.1 }],
      { profileFtp: 280, intervalsConfig: { apiKey: 'k' } },
    );

    expect(result.enrichedCount).toBe(1);
    expect(result.activities[0].threshold_drift_pct).toBe(5.2);
  });

  it('formatSyncDriftRemainderNote guides user to backfill', () => {
    expect(formatSyncDriftRemainderNote(0)).toBe('');
    expect(formatSyncDriftRemainderNote(2)).toContain('Decoupling backfill');
  });
});
