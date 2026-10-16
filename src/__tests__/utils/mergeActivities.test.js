import { describe, it, expect } from 'vitest';
import {
  isStravaOnlyActivityId,
  isLikelyIntervalsActivityId,
  pickMergedTitle,
  mergeActivitiesIntervalsPrimary,
  pickMergePairSides,
  stripUndefinedFields,
} from '../../utils/mergeActivities';

describe('id heuristics', () => {
  it('detects strava import id', () => {
    expect(isStravaOnlyActivityId('strava_123')).toBe(true);
    expect(isStravaOnlyActivityId('12345')).toBe(false);
  });

  it('detects intervals-like ids', () => {
    expect(isLikelyIntervalsActivityId('88442211')).toBe(true);
    expect(isLikelyIntervalsActivityId('i53534754')).toBe(true);
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

describe('pickMergePairSides', () => {
  it('merges two Intervals rows when they look like duplicates', () => {
    const enriched = {
      id: 'i100',
      date: '2019-05-04',
      title: 'FulGaz - Col du Chaussy',
      strava_id: '555',
      load: 53,
      distance: 0,
      moving_time: '43:21',
      type: 'VirtualRide',
    };
    const sparse = {
      id: 'i200',
      date: '2019-05-04',
      title: 'FulGaz - Col du Chaussy',
      distance: 10,
      gear_name: 'Gilbertson Allure',
      load: 0,
      moving_time: '43:21',
      type: 'VirtualRide',
    };
    const sides = pickMergePairSides(enriched, sparse);
    expect(sides.error).toBeUndefined();
    expect(sides.primary.id).toBe('i100');
    expect(sides.secondary.id).toBe('i200');
  });

  it('rejects unrelated pair', () => {
    const sides = pickMergePairSides(
      { id: 'a', date: '2020-01-01', title: 'Ride A', moving_time: 3600, distance: 30, type: 'Ride' },
      { id: 'b', date: '2020-01-01', title: 'Ride B', moving_time: 7200, distance: 60, type: 'Ride' },
    );
    expect(sides.error).toBeTruthy();
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

  it('prefers Strava map-corrected elevation over Intervals climbing', () => {
    const primary = {
      id: '100',
      title: 'Ride',
      climbing: 1200,
      strava_id: null,
    };
    const secondary = {
      id: 'strava_9',
      strava_id: '999',
      total_elevation_gain: 890,
      climbing: 890,
      climbing_from_strava: true,
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.climbing).toBe(890);
    expect(m.climbing_from_strava).toBe(true);
  });

  it('does not zero Intervals climbing when Strava elevation is missing', () => {
    const primary = {
      id: '100',
      title: 'Ride',
      climbing: 1200,
      strava_id: null,
    };
    // Normalized Strava row without total_elevation_gain used to set climbing:0
    // and climbing_from_strava:true, which wiped Intervals meters on merge.
    const secondary = {
      id: 'strava_9',
      strava_id: '999',
      climbing: 0,
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.climbing).toBe(1200);
    expect(m.climbing_from_strava).toBeUndefined();
  });

  it('keeps authentic Strava flat-ride elevation of 0 over Intervals climbing', () => {
    const primary = {
      id: '100',
      title: 'Ride',
      climbing: 40,
      strava_id: null,
    };
    const secondary = {
      id: 'strava_9',
      strava_id: '999',
      total_elevation_gain: 0,
      climbing: 0,
      climbing_from_strava: true,
    };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.climbing).toBe(0);
    expect(m.climbing_from_strava).toBe(true);
  });

  it('copies intervals_map from secondary when primary has none', () => {
    const primary = { id: 'i1', title: 'Sparse', distance: 0 };
    const secondary = { id: 'i2', title: 'Full', distance: 18.1, intervals_map: 'encodedPoly' };
    const m = mergeActivitiesIntervalsPrimary(primary, secondary);
    expect(m.intervals_map).toBe('encodedPoly');
    expect(m.distance).toBe(18.1);
  });
});
