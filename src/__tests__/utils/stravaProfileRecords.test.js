import { describe, it, expect } from 'vitest';
import { matchRecordActivities } from '../../utils/stravaProfileRecords';

describe('matchRecordActivities', () => {
  const stats = { biggest_ride_distance: 100000, biggest_climb_elevation_gain: 2500 };

  it('links longest and highest rides when history is complete', () => {
    const acts = [
      { id: 1, distance: 50000, total_elevation_gain: 800, name: 'Short' },
      { id: 2, distance: 100000, total_elevation_gain: 1200, name: 'Long exact' },
      { id: 3, distance: 80000, total_elevation_gain: 2500, name: 'High exact' }
    ];
    const r = matchRecordActivities(acts, stats, { historyComplete: true });
    expect(r.longestRide?.id).toBe(2);
    expect(r.mostElevation?.id).toBe(3);
  });

  it('returns null when stats do not match scanned rides and history incomplete', () => {
    const acts = [{ id: 1, distance: 10000, total_elevation_gain: 200, name: 'Tiny' }];
    const r = matchRecordActivities(acts, stats, { historyComplete: false });
    expect(r.longestRide).toBe(null);
    expect(r.mostElevation).toBe(null);
  });
});
