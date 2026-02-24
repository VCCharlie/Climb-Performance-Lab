/**
 * Tests for src/utils/dedup.js
 * Priority: HIGH — missed duplicates = inflated stats, false matches = lost data
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isSameActivity, findDuplicatesInList } from '../../utils/dedup';

const fixturesDir = resolve(__dirname, '../fixtures');
const activities = JSON.parse(readFileSync(resolve(fixturesDir, 'activities-with-duplicates.json'), 'utf-8'));

// ─── isSameActivity ─────────────────────────────────────────────────────────

describe('isSameActivity', () => {
  it('matches same ID', () => {
    const a = { id: 'x', date: '2025-06-15', type: 'Ride', moving_time: 3600, distance: 50 };
    expect(isSameActivity(a, { ...a })).toBe(true);
  });

  it('matches same date + close duration AND close distance (true duplicate from two sources)', () => {
    expect(isSameActivity(activities[0], activities[1])).toBe(true);
    // strava_001: 7200s, 85.5km — intervals_001: 7190s, 85.3km
    // durationDiff 10s < 300s AND distDiff 0.2km < 0.5km → duplicate
  });

  it('rejects different dates', () => {
    expect(isSameActivity(activities[0], activities[3])).toBe(false);
    // June 15 vs June 16
  });

  it('rejects different major types (Ride vs Run)', () => {
    expect(isSameActivity(activities[0], activities[2])).toBe(false);
    // Ride vs Run on same date
  });

  it('accepts Ride vs VirtualRide as same category', () => {
    expect(isSameActivity(activities[3], activities[4])).toBe(true);
    // VirtualRide vs Ride, same date, close metrics
  });

  it('rejects both-zero activities (safety)', () => {
    expect(isSameActivity(activities[6], activities[7])).toBe(false);
    // Both have 0 distance and 0 time
  });

  it('rejects same date but very different metrics', () => {
    // strava_001 (7200s, 85.5km) vs far_apart_007 (1800s, 25km)
    expect(isSameActivity(activities[0], activities[8])).toBe(false);
  });

  it('handles missing date gracefully', () => {
    const noDate = { id: 'nd', type: 'Ride', moving_time: 3600, distance: 50 };
    expect(isSameActivity(noDate, activities[0])).toBe(false);
  });

  // ─── AND logic: one metric alone is NOT enough ───────────────────────────

  it('rejects when only duration matches but distance is different (OR bug fix)', () => {
    // Two genuinely different rides that happen to share the same duration
    const a = { id: 'a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30 };
    const b = { id: 'b', date: '2025-06-20', type: 'Ride', moving_time: 3580, distance: 45 };
    // durationDiff 20s < 300s ✓  BUT  distDiff 15km > 0.5km ✗ → not a duplicate
    expect(isSameActivity(a, b)).toBe(false);
  });

  it('rejects when only distance matches but duration is different (OR bug fix)', () => {
    // Same-distance rides on the same day that differ in duration
    const a = { id: 'a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30 };
    const b = { id: 'b', date: '2025-06-20', type: 'Ride', moving_time: 7200, distance: 30.2 };
    // distDiff 0.2km < 0.5km ✓  BUT  durationDiff 3600s > 300s ✗ → not a duplicate
    expect(isSameActivity(a, b)).toBe(false);
  });

  // ─── Start-time proximity (full datetime) ────────────────────────────────

  it('rejects same-day activities with identical metrics but different start times', () => {
    // Morning and evening ride with nearly identical distance/duration → two real activities
    const morning = { id: 'a1', date: '2025-06-15T07:00:00Z', type: 'Ride', moving_time: 3600, distance: 30 };
    const evening = { id: 'a2', date: '2025-06-15T17:00:00Z', type: 'Ride', moving_time: 3600, distance: 30 };
    // Start times 10 h apart → different activities, not duplicates
    expect(isSameActivity(morning, evening)).toBe(false);
  });

  it('matches activities that started within 15 minutes of each other', () => {
    const a = { id: 'strava', date: '2025-06-15T08:30:00Z', type: 'Ride', moving_time: 7200, distance: 85.5 };
    const b = { id: 'garmin', date: '2025-06-15T08:35:00Z', type: 'Ride', moving_time: 7190, distance: 85.3 };
    // 5-min start diff AND close metrics → duplicate
    expect(isSameActivity(a, b)).toBe(true);
  });

  // ─── Power check ─────────────────────────────────────────────────────────

  it('rejects when duration + distance match but power differs by more than 15%', () => {
    const a = { id: 'a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30, avg_power: 200 };
    const b = { id: 'b', date: '2025-06-20', type: 'Ride', moving_time: 3610, distance: 30.1, avg_power: 150 };
    // powDiff 50 / 200 = 25% > 15% → different activities
    expect(isSameActivity(a, b)).toBe(false);
  });

  it('matches when duration + distance + power are all similar', () => {
    const a = { id: 'a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30, avg_power: 200 };
    const b = { id: 'b', date: '2025-06-20', type: 'Ride', moving_time: 3610, distance: 30.1, avg_power: 205 };
    // powDiff 5 / 205 = 2.4% < 15% → duplicate
    expect(isSameActivity(a, b)).toBe(true);
  });

  it('ignores power check when one activity has no power data', () => {
    const a = { id: 'a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30, avg_power: 200 };
    const b = { id: 'b', date: '2025-06-20', type: 'Ride', moving_time: 3590, distance: 30.1 }; // no power
    // Power check skipped when one has no data → fall back to duration + distance
    expect(isSameActivity(a, b)).toBe(true);
  });
});

// ─── findDuplicatesInList ───────────────────────────────────────────────────

describe('findDuplicatesInList', () => {
  it('finds duplicate pairs in fixture data', () => {
    const dupes = findDuplicatesInList(activities);
    expect(dupes.length).toBeGreaterThan(0);
  });

  it('detects Strava/Intervals duplicate pair', () => {
    const dupes = findDuplicatesInList(activities);
    const pair = dupes.find(d =>
      (d.a.id === 'strava_001' && d.b.id === 'intervals_001') ||
      (d.a.id === 'intervals_001' && d.b.id === 'strava_001')
    );
    expect(pair).toBeTruthy();
  });

  it('detects VirtualRide/Ride cross-type duplicate', () => {
    const dupes = findDuplicatesInList(activities);
    const pair = dupes.find(d =>
      (d.a.id === 'strava_003' && d.b.id === 'garmin_003') ||
      (d.a.id === 'garmin_003' && d.b.id === 'strava_003')
    );
    expect(pair).toBeTruthy();
  });

  it('does NOT flag unique activities', () => {
    const dupes = findDuplicatesInList(activities);
    const uniqueFlagged = dupes.some(d =>
      d.a.id === 'unique_004' || d.b.id === 'unique_004'
    );
    expect(uniqueFlagged).toBe(false);
  });

  it('does NOT flag empty activities as duplicates', () => {
    const dupes = findDuplicatesInList(activities);
    const emptyMatch = dupes.some(d =>
      d.a.id === 'empty_005' || d.b.id === 'empty_005' ||
      d.a.id === 'empty_006' || d.b.id === 'empty_006'
    );
    expect(emptyMatch).toBe(false);
  });

  it('does NOT flag two different same-day activities as duplicate when only one metric matches', () => {
    // Realistic scenario: morning ride 30 km / 1h + evening ride 30 km / 2h
    const mixed = [
      { id: 'ride_a', date: '2025-06-20', type: 'Ride', moving_time: 3600, distance: 30 },
      { id: 'ride_b', date: '2025-06-20', type: 'Ride', moving_time: 7200, distance: 30.2 },
    ];
    const dupes = findDuplicatesInList(mixed);
    expect(dupes).toHaveLength(0);
  });

  it('returns empty for single-item list', () => {
    expect(findDuplicatesInList([activities[0]])).toEqual([]);
  });

  it('returns empty for null/undefined', () => {
    expect(findDuplicatesInList(null)).toEqual([]);
    expect(findDuplicatesInList(undefined)).toEqual([]);
    expect(findDuplicatesInList([])).toEqual([]);
  });
});
