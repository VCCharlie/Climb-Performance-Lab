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

  it('matches same date + close time (within 5 min)', () => {
    expect(isSameActivity(activities[0], activities[1])).toBe(true);
    // strava_001: 7200s, intervals_001: 7190s → diff 10s < 300s
  });

  it('matches same date + close distance (within 0.5km)', () => {
    expect(isSameActivity(activities[0], activities[1])).toBe(true);
    // 85.5 vs 85.3 → diff 0.2 < 0.5
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

  it('returns empty for single-item list', () => {
    expect(findDuplicatesInList([activities[0]])).toEqual([]);
  });

  it('returns empty for null/undefined', () => {
    expect(findDuplicatesInList(null)).toEqual([]);
    expect(findDuplicatesInList(undefined)).toEqual([]);
    expect(findDuplicatesInList([])).toEqual([]);
  });
});
