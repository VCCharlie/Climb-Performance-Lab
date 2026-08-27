/**
 * Phase 1 regression tests: data integrity fixes (M1–M3, E6, Strava match).
 */
import { describe, it, expect } from 'vitest';
import { smartParseJSON } from '../../utils/parsers';
import { normalizeIntervalsActivity } from '../../utils/intervals';
import { normalizeDate, normalizeActivityDate } from '../../utils/formatters';
import { activityDistanceKm } from '../../utils/activityFilterMetrics';
import { matchStravaToSite } from '../../utils/stravaMatch';

describe('Phase 1 — date-time preservation', () => {
  it('stores full ISO datetime from Intervals start_date_local', () => {
    const norm = normalizeIntervalsActivity({
      id: 'dt1',
      start_date_local: '2025-08-01T14:22:33+02:00',
      name: 'Afternoon ride',
      type: 'Ride',
      moving_time: 3600,
      distance: 40000,
    });
    expect(norm.date).toMatch(/^2025-08-01T/);
    expect(normalizeDate(norm.date)).toBe('2025-08-01');
    expect(normalizeActivityDate(norm.date)).toBe(norm.date);
  });
});

describe('Phase 1 — elevation fallback', () => {
  it('does not use total_elevation_loss as climbing', () => {
    const norm = normalizeIntervalsActivity({
      id: 'elev1',
      startDate: '2025-06-01',
      name: 'Descent only',
      type: 'Ride',
      moving_time: 3600,
      total_elevation_loss: 900,
    });
    expect(norm.climbing).toBe(0);
  });

  it('uses total_elevation_gain when present', () => {
    const norm = normalizeIntervalsActivity({
      id: 'elev2',
      startDate: '2025-06-01',
      name: 'Climb',
      type: 'Ride',
      moving_time: 3600,
      total_elevation_gain: 812,
    });
    expect(norm.climbing).toBe(812);
  });
});

describe('Phase 1 — null date handling', () => {
  it('normalizeDate returns null for missing values', () => {
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate('')).toBeNull();
  });
});

describe('Phase 1 — activityDistanceKm', () => {
  it('treats stored distance as km without meters heuristic', () => {
    expect(activityDistanceKm({ distance: 42.5 })).toBe(42.5);
    expect(activityDistanceKm({ distance: 0.76 })).toBe(0.76);
  });
});

describe('Phase 1 — Strava fuzzy match with numeric moving_time', () => {
  it('matches site activities that store moving_time as seconds', () => {
    const stravaList = [{
      id: 999001,
      start_date_local: '2025-07-10T08:00:00Z',
      sport_type: 'Ride',
      distance: 50000,
      moving_time: 3600,
      name: 'Morning loop',
    }];
    const site = [{
      id: 'site1',
      date: '2025-07-10T08:00:00.000Z',
      type: 'Ride',
      distance: 50,
      moving_time: 3600,
      title: 'Morning Ride',
    }];
    const { matched } = matchStravaToSite(stravaList, site);
    expect(matched).toHaveLength(1);
    expect(matched[0].confidence).toBe('high');
  });
});

describe('Phase 1 — cloud-shaped JSON import', () => {
  it('smartParseJSON handles Python/cloud export shape', () => {
    const json = JSON.stringify({
      id: 'py1',
      date: '2025-05-20',
      title: 'Export ride',
      type: 'Ride',
      distance: 35.2,
      climbing: 400,
      moving_time: 5400,
      avg_power: 180,
    });
    const [row] = smartParseJSON(json);
    expect(row.distance).toBe(35.2);
    expect(row.climbing).toBe(400);
    expect(row.avg_power).toBe(180);
  });
});
