import { describe, it, expect } from 'vitest';
import { computeYtdYearOverYearFromActivities, percentChange } from '../../utils/stravaYtdCompare';

describe('percentChange', () => {
  it('returns null when previous is zero', () => {
    expect(percentChange(100, 0)).toBe(null);
  });

  it('computes positive change', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
  });
});

describe('computeYtdYearOverYearFromActivities', () => {
  it('splits YTD windows by reference date', () => {
    const ref = new Date(2026, 3, 6); // 6 Apr 2026
    const acts = [
      { start_date_local: '2026-01-15T10:00:00', distance: 10000, total_elevation_gain: 100, moving_time: 3600 },
      { start_date_local: '2026-04-05T10:00:00', distance: 20000, total_elevation_gain: 200, moving_time: 7200 },
      { start_date_local: '2025-04-05T10:00:00', distance: 5000, total_elevation_gain: 50, moving_time: 1800 },
      { start_date_local: '2025-01-15T10:00:00', distance: 8000, total_elevation_gain: 80, moving_time: 2400 },
    ];
    const r = computeYtdYearOverYearFromActivities(acts, ref);
    expect(r.thisYtd.count).toBe(2);
    expect(r.prevYtd.count).toBe(2);
    expect(r.thisYtd.distance).toBe(30000);
    expect(r.prevYtd.distance).toBe(13000);
  });
});
