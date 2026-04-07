import { describe, it, expect } from 'vitest';
import {
  matchRecordActivities,
  aggregateBikeActivitiesByContext,
  getStravaRawActivityListFetchCap,
  STRAVA_ACTIVITY_LIST_PAGE_SIZE,
  STRAVA_ACTIVITY_SCAN_DEFAULT_MAX_PAGES,
} from '../../utils/stravaProfileRecords';

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

  it('always exposes max total elevation ride from scan when any elevation data exists', () => {
    const acts = [
      { id: 1, distance: 20000, total_elevation_gain: 500, name: 'A' },
      { id: 2, distance: 15000, total_elevation_gain: 1800, name: 'B' }
    ];
    const r = matchRecordActivities(acts, stats, { historyComplete: false });
    expect(r.maxTotalElevationRide?.id).toBe(2);
    expect(r.maxTotalElevationM).toBe(1800);
  });
});

describe('aggregateBikeActivitiesByContext', () => {
  it('splits outdoor vs indoor and sums', () => {
    const acts = [
      { sport_type: 'Ride', distance: 10000, total_elevation_gain: 500, moving_time: 3600 },
      { sport_type: 'VirtualRide', distance: 20000, total_elevation_gain: 200, moving_time: 7200 }
    ];
    const r = aggregateBikeActivitiesByContext(acts);
    expect(r.combined.count).toBe(2);
    expect(r.outdoor.count).toBe(1);
    expect(r.indoor.count).toBe(1);
    expect(r.combined.distance).toBe(30000);
    expect(r.outdoor.distance).toBe(10000);
    expect(r.indoor.distance).toBe(20000);
    expect(r.combined.avg_distance).toBe(15000);
  });
});

describe('getStravaRawActivityListFetchCap', () => {
  it('defaults to maxPages × per_page', () => {
    expect(STRAVA_ACTIVITY_LIST_PAGE_SIZE).toBe(200);
    expect(STRAVA_ACTIVITY_SCAN_DEFAULT_MAX_PAGES).toBe(100);
    expect(getStravaRawActivityListFetchCap()).toBe(20000);
  });

  it('respects custom maxPages', () => {
    expect(getStravaRawActivityListFetchCap({ maxPages: 50 })).toBe(10000);
  });
});
