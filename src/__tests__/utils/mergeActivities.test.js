import { describe, it, expect } from 'vitest';
import {
  isStravaOnlyActivityId,
  isLikelyIntervalsActivityId,
  pickMergedTitle,
  mergeActivitiesIntervalsPrimary,
  stripUndefinedFields,
} from '../../utils/mergeActivities';

describe('id heuristics', () => {
  it('detects strava import id', () => {
    expect(isStravaOnlyActivityId('strava_123')).toBe(true);
    expect(isStravaOnlyActivityId('12345')).toBe(false);
  });

  it('detects intervals-like ids', () => {
    expect(isLikelyIntervalsActivityId('88442211')).toBe(true);
    expect(isLikelyIntervalsActivityId('csv_abc')).toBe(true);
    expect(isLikelyIntervalsActivityId('strava_1')).toBe(false);
  });
});

describe('pickMergedTitle', () => {
  it('prefers specific over generic', () => {
    expect(pickMergedTitle('Morning Ride', 'Alp d Huez')).toBe('Alp d Huez');
  });
});

describe('stripUndefinedFields', () => {
  it('removes undefined keys', () => {
    expect(stripUndefinedFields({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
});

describe('mergeActivitiesIntervalsPrimary', () => {
  it('throws when both have different strava_id', () => {
    expect(() =>
      mergeActivitiesIntervalsPrimary(
        { id: '1', strava_id: '111', title: 'A' },
        { id: 'strava_2', strava_id: '222', title: 'B' }
      )
    ).toThrow(/already has strava_id/);
  });

  it('does not set gear_name undefined when gear_id copied without names', () => {
    const m = mergeActivitiesIntervalsPrimary(
      { id: '1', title: 'Ride', gear_name: undefined },
      { id: 'strava_2', strava_id: '9', gear_id: 'g1', gear_name: undefined, title: 'X' }
    );
    expect('gear_name' in m).toBe(false);
    expect(m.gear_id).toBe('g1');
  });

  it('copies moving_time from Strava when primary has 0 (string H:MM:SS from Strava import)', () => {
    const primary = {
      id: '100',
      title: 'Ride',
      moving_time: 0,
      strava_id: null,
    };
    const secondary = {
      id: 'strava_9',
      strava_id: '999',
      moving_time: '1:30:00',
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.moving_time).toBe(5400);
  });

  it('replaces implausible primary distance with Strava km when Strava is short ride', () => {
    const primary = {
      id: '100',
      title: 'Ride',
      distance: 772.5,
      moving_time: 3600,
      strava_id: null,
    };
    const secondary = {
      id: 'strava_9',
      strava_id: '999',
      distance: 0.8,
      moving_time: '1:00:00',
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.distance).toBe(0.8);
  });

  it('keeps power from primary, adds strava from secondary', () => {
    const komSummary = { label: 'PR · KOM#2', tooltip: 'Segment (PR, KOM#2)' };
    const primary = {
      id: '100',
      title: 'Ride',
      norm_power: 250,
      avg_power: 240,
      load: 80,
      strava_id: null,
    };
    const secondary = {
      id: 'strava_9',
      title: 'Nice climb day',
      strava_id: '999',
      norm_power: 0,
      avg_power: 0,
      strava_kom_summary: komSummary,
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.id).toBe('100');
    expect(m.strava_id).toBe('999');
    expect(m.norm_power).toBe(250);
    expect(m.title).toBe('Nice climb day');
    expect(m.strava_kom_summary).toEqual(komSummary);
  });
});
