import { describe, it, expect } from 'vitest';
import {
  findSafeImportReplacementDuplicate,
  isSafeImportReplacementDuplicate,
  movingTimeToSeconds,
} from '../../utils/importDuplicateMatch';

describe('import duplicate replacement matching', () => {
  it('normalizes mixed moving_time formats before comparing', () => {
    expect(movingTimeToSeconds('1:00:05')).toBe(3605);
    expect(movingTimeToSeconds(3600)).toBe(3600);
  });

  it('matches replacement candidates only when Strava identity also matches', () => {
    const existing = {
      id: '123',
      strava_id: '987654321',
      date: '2026-04-30T10:00:00',
      type: 'Ride',
      moving_time: '1:00:05',
      distance: 30.1,
    };
    const incoming = {
      id: 'strava_987654321',
      strava_id: '987654321',
      date: '2026-04-30',
      type: 'Ride',
      moving_time: 3600,
      distance: 30.2,
    };

    expect(isSafeImportReplacementDuplicate(existing, incoming)).toBe(true);
  });

  it('does not delete a same-day ride without a shared Strava id', () => {
    const existing = {
      id: 'morning',
      date: '2026-04-30',
      type: 'Ride',
      moving_time: 3600,
      distance: 30.0,
    };
    const incoming = {
      id: 'evening',
      date: '2026-04-30',
      type: 'Ride',
      moving_time: 3650,
      distance: 30.2,
    };

    expect(isSafeImportReplacementDuplicate(existing, incoming)).toBe(false);
  });

  it('finds only the safe duplicate among plausible same-day activities', () => {
    const activities = [
      {
        id: 'other',
        date: '2026-04-30',
        type: 'Ride',
        moving_time: 3650,
        distance: 30.2,
      },
      {
        id: 'intervals',
        strava_id: '123456789',
        date: '2026-04-30',
        type: 'Ride',
        moving_time: 3600,
        distance: 30.1,
      },
    ];
    const incoming = {
      id: 'strava_123456789',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      moving_time: '1:00:04',
      distance: 30.0,
    };

    expect(findSafeImportReplacementDuplicate(activities, incoming)?.id).toBe('intervals');
  });
});
