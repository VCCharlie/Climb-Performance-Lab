import { describe, it, expect } from 'vitest';
import {
  buildImportReplacementPlan,
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

  it('finds only a Strava-only duplicate when importing a canonical Intervals row', () => {
    const activities = [
      {
        id: 'other',
        date: '2026-04-30',
        type: 'Ride',
        moving_time: 3650,
        distance: 30.2,
      },
      {
        id: 'strava_123456789',
        strava_id: '123456789',
        date: '2026-04-30',
        type: 'Ride',
        moving_time: '1:00:04',
        distance: 30.0,
      },
    ];
    const incoming = {
      id: 'intervals',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      moving_time: 3600,
      distance: 30.1,
    };

    expect(findSafeImportReplacementDuplicate(activities, incoming)?.id).toBe('strava_123456789');
  });

  it('does not select an Intervals row for deletion when importing a Strava row', () => {
    const activities = [
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

    expect(findSafeImportReplacementDuplicate(activities, incoming)).toBeNull();
  });

  it('merges Strava enrichment into an incoming Intervals replacement before deleting the Strava row', () => {
    const kom = { label: 'PR · KOM#2', tooltip: 'Segment (PR, KOM#2)' };
    const existing = {
      id: 'strava_123456789',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      title: 'Nice climb day',
      moving_time: '1:00:04',
      distance: 30.0,
      gear_id: 'b1',
      gear_name: 'Race Bike',
      strava_map: 'abc123',
      strava_kom_summary: kom,
    };
    const incoming = {
      id: 'intervals',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      title: 'Morning Ride',
      moving_time: 3600,
      distance: 30.1,
      norm_power: 250,
      load: 82,
    };

    const plan = buildImportReplacementPlan([existing], [incoming]);

    expect(plan.idsToDelete).toEqual(['strava_123456789']);
    expect(plan.replacedCount).toBe(1);
    expect(plan.activitiesToImport).toEqual([
      {
        ...incoming,
        title: 'Nice climb day',
        gear_id: 'b1',
        gear_name: 'Race Bike',
        strava_map: 'abc123',
        strava_kom_summary: kom,
      },
    ]);
  });

  it('merges a Strava import into the existing Intervals row instead of deleting it', () => {
    const existing = {
      id: 'intervals',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      title: 'Morning Ride',
      moving_time: 3600,
      distance: 30.1,
      norm_power: 260,
      load: 90,
    };
    const incoming = {
      id: 'strava_123456789',
      strava_id: '123456789',
      date: '2026-04-30',
      type: 'Ride',
      title: 'Nice climb day',
      moving_time: '1:00:03',
      distance: 30.0,
      gear_id: 'b1',
      gear_name: 'Race Bike',
    };

    const plan = buildImportReplacementPlan([existing], [incoming]);

    expect(plan.idsToDelete).toEqual([]);
    expect(plan.replacedCount).toBe(1);
    expect(plan.activitiesToImport).toEqual([
      {
        ...existing,
        title: 'Nice climb day',
        gear_id: 'b1',
        gear_name: 'Race Bike',
      },
    ]);
  });
});
