/**
 * Tests for src/utils/duplicateDetection.js
 * Priority: HIGH — stricter thresholds than dedup.js (15min, 500m, 60s)
 */
import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../../utils/duplicateDetection';

// ─── BASIC BEHAVIOR ──────────────────────────────────────────────────────────

describe('findDuplicates - basic', () => {
  it('returns empty for null/undefined/empty', () => {
    expect(findDuplicates(null)).toEqual([]);
    expect(findDuplicates(undefined)).toEqual([]);
    expect(findDuplicates([])).toEqual([]);
  });

  it('returns empty for single activity', () => {
    expect(findDuplicates([
      { id: 'a1', date: '2025-06-15T08:00:00Z', distance: 50, moving_time: 3600 }
    ])).toEqual([]);
  });

  it('returns empty when no duplicates exist', () => {
    const activities = [
      { id: 'a1', date: '2025-06-15T08:00:00Z', distance: 85, moving_time: 7200 },
      { id: 'a2', date: '2025-06-16T08:00:00Z', distance: 42, moving_time: 3600 },
      { id: 'a3', date: '2025-06-17T18:00:00Z', distance: 28, moving_time: 2700 },
    ];
    expect(findDuplicates(activities)).toEqual([]);
  });
});

// ─── DUPLICATE DETECTION ─────────────────────────────────────────────────────

describe('findDuplicates - matching', () => {
  it('detects exact duplicates (same time, distance, duration)', () => {
    const activities = [
      { id: 'strava_1', date: '2025-06-15T08:30:00Z', distance: 85.5, moving_time: 7200 },
      { id: 'intervals_1', date: '2025-06-15T08:30:00Z', distance: 85.5, moving_time: 7200 },
    ];
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].items).toHaveLength(2);
  });

  it('detects fuzzy duplicates within thresholds', () => {
    const activities = [
      { id: 'strava_1', date: '2025-06-15T08:30:00Z', distance: 85.5, moving_time: 7200 },
      { id: 'garmin_1', date: '2025-06-15T08:35:00Z', distance: 85.3, moving_time: 7190 },
    ];
    // Time diff: 5min < 15min ✓, Dist diff: 0.2km < 0.5km ✓, Duration diff: 10s < 60s ✓
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
  });

  it('conflict has correct structure', () => {
    const activities = [
      { id: 'a1', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 },
      { id: 'a2', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 },
    ];
    const conflicts = findDuplicates(activities);
    expect(conflicts[0]).toHaveProperty('id', 'conflict_a1');
    expect(conflicts[0]).toHaveProperty('items');
    expect(conflicts[0].items[0].id).toBe('a1');
    expect(conflicts[0].items[1].id).toBe('a2');
  });

  it('groups 3+ duplicates into one conflict', () => {
    const activities = [
      { id: 'strava', date: '2025-06-15T08:30:00Z', distance: 85, moving_time: 7200 },
      { id: 'garmin', date: '2025-06-15T08:32:00Z', distance: 85.1, moving_time: 7195 },
      { id: 'intervals', date: '2025-06-15T08:31:00Z', distance: 85.2, moving_time: 7210 },
    ];
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].items).toHaveLength(3);
  });
});

// ─── THRESHOLD BOUNDARIES ────────────────────────────────────────────────────

describe('findDuplicates - threshold boundaries', () => {
  const base = { id: 'base', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 };

  it('rejects time diff > 15 minutes', () => {
    const activities = [
      base,
      { id: 'too_late', date: '2025-06-15T08:46:00Z', distance: 50, moving_time: 3600 },
    ];
    // 16min > 15min threshold
    expect(findDuplicates(activities)).toEqual([]);
  });

  it('accepts time diff exactly at 15 minutes', () => {
    const activities = [
      base,
      { id: 'at_limit', date: '2025-06-15T08:45:00Z', distance: 50, moving_time: 3600 },
    ];
    // 15min <= 15min threshold
    expect(findDuplicates(activities)).toHaveLength(1);
  });

  it('rejects distance diff > 0.5km', () => {
    const activities = [
      base,
      { id: 'far', date: '2025-06-15T08:30:00Z', distance: 50.6, moving_time: 3600 },
    ];
    // 0.6km > 0.5km threshold
    expect(findDuplicates(activities)).toEqual([]);
  });

  it('accepts distance diff exactly at 0.5km', () => {
    const activities = [
      base,
      { id: 'close', date: '2025-06-15T08:30:00Z', distance: 50.5, moving_time: 3600 },
    ];
    expect(findDuplicates(activities)).toHaveLength(1);
  });

  it('rejects duration diff > 60 seconds', () => {
    const activities = [
      base,
      { id: 'longer', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3661 },
    ];
    // 61s > 60s threshold
    expect(findDuplicates(activities)).toEqual([]);
  });

  it('accepts duration diff exactly at 60 seconds', () => {
    const activities = [
      base,
      { id: 'close', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3660 },
    ];
    expect(findDuplicates(activities)).toHaveLength(1);
  });

  it('requires ALL three criteria to match (not just one)', () => {
    const activities = [
      base,
      { id: 'time_ok_but_dist_far', date: '2025-06-15T08:31:00Z', distance: 55, moving_time: 3600 },
    ];
    // Time OK (1min), Duration OK (0s), but distance off by 5km
    expect(findDuplicates(activities)).toEqual([]);
  });
});

// ─── EDGE CASES ──────────────────────────────────────────────────────────────

describe('findDuplicates - edge cases', () => {
  it('handles missing distance/moving_time (treated as 0)', () => {
    const activities = [
      { id: 'a1', date: '2025-06-15T08:30:00Z' },
      { id: 'a2', date: '2025-06-15T08:30:00Z' },
    ];
    // Both distance=0, moving_time=0, time=0 → all within thresholds
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
  });

  it('handles unsorted input (sorts internally)', () => {
    const activities = [
      { id: 'late', date: '2025-06-17T08:00:00Z', distance: 30, moving_time: 2700 },
      { id: 'early', date: '2025-06-15T08:30:00Z', distance: 85, moving_time: 7200 },
      { id: 'early_dup', date: '2025-06-15T08:32:00Z', distance: 85.1, moving_time: 7190 },
    ];
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
    // The June 15 pair should be detected
    const ids = conflicts[0].items.map(i => i.id);
    expect(ids).toContain('early');
    expect(ids).toContain('early_dup');
  });

  it('skips already-processed IDs (no double-counting)', () => {
    const activities = [
      { id: 'a1', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 },
      { id: 'a2', date: '2025-06-15T08:31:00Z', distance: 50, moving_time: 3600 },
      { id: 'a3', date: '2025-06-15T08:32:00Z', distance: 50, moving_time: 3600 },
    ];
    const conflicts = findDuplicates(activities);
    // All three grouped into one conflict, not multiple pairs
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].items).toHaveLength(3);
  });

  it('early break optimization works (far future dates not compared)', () => {
    const activities = [
      { id: 'a1', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 },
      { id: 'a2', date: '2025-06-15T08:30:00Z', distance: 50, moving_time: 3600 },
      { id: 'a3', date: '2025-12-01T08:30:00Z', distance: 50, moving_time: 3600 },
    ];
    const conflicts = findDuplicates(activities);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].items).toHaveLength(2);
    // a3 should NOT be in the conflict
    expect(conflicts[0].items.map(i => i.id)).not.toContain('a3');
  });
});
