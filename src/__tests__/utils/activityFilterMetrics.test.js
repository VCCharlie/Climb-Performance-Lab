import { describe, it, expect } from 'vitest';
import {
  activityDistanceKm,
  activityMovingTimeSec,
  activityAvgSpeedKmh,
  activityIntensityFactor,
  parseNumericBound,
  inNumericRange,
  activityDescriptionSearchText,
  activityMatchesLogSearch,
  activityDriftPct,
  activityMatchesDriftRange,
} from '../../utils/activityFilterMetrics';

describe('activityDistanceKm', () => {
  it('treats large numbers as meters', () => {
    expect(activityDistanceKm({ distance: 50000 })).toBe(50);
  });

  it('treats small numbers as km', () => {
    expect(activityDistanceKm({ distance: 45.2 })).toBe(45.2);
  });
});

describe('activityMovingTimeSec', () => {
  it('parses H:MM:SS string', () => {
    expect(activityMovingTimeSec({ moving_time: '1:30:00' })).toBe(5400);
  });

  it('accepts numeric seconds', () => {
    expect(activityMovingTimeSec({ moving_time: 3600 })).toBe(3600);
  });
});

describe('activityAvgSpeedKmh', () => {
  it('derives from distance and time when avg_speed missing', () => {
    const spd = activityAvgSpeedKmh({ avg_speed: 0 }, 40, 3600);
    expect(spd).toBeCloseTo(40);
  });
});

describe('activityIntensityFactor', () => {
  it('returns NP divided by FTP when both valid', () => {
    expect(activityIntensityFactor(270, 300)).toBeCloseTo(0.9);
  });

  it('returns null without FTP or NP', () => {
    expect(activityIntensityFactor(270, 0)).toBe(null);
    expect(activityIntensityFactor(0, 300)).toBe(null);
    expect(activityIntensityFactor(undefined, 300)).toBe(null);
  });
});

describe('parseNumericBound / inNumericRange', () => {
  it('parses empty as null', () => {
    expect(parseNumericBound('')).toBe(null);
  });

  it('enforces min and max', () => {
    expect(inNumericRange(50, 40, 60)).toBe(true);
    expect(inNumericRange(30, 40, 60)).toBe(false);
    expect(inNumericRange(70, 40, 60)).toBe(false);
  });
});

describe('activityDescriptionSearchText', () => {
  it('strips HTML from Strava descriptions', () => {
    expect(activityDescriptionSearchText({
      description: 'Long ride with <b>Alpe d\'Huez</b><br/>felt great',
    })).toBe('Long ride with Alpe d\'Huez felt great');
  });

  it('falls back to notes when description is empty', () => {
    expect(activityDescriptionSearchText({ notes: 'Recovery spin' })).toBe('Recovery spin');
  });
});

describe('activityMatchesDriftRange', () => {
  it('returns finite drift pct values', () => {
    expect(activityDriftPct({ decoupling_pct: 5.5 }, 'decoupling_pct')).toBe(5.5);
    expect(activityDriftPct({ decoupling_pct: null }, 'decoupling_pct')).toBe(null);
    expect(activityDriftPct({}, 'threshold_drift_pct')).toBe(null);
  });

  it('matches activities with finite drift within bounds', () => {
    const activity = { decoupling_pct: 4.2, threshold_drift_pct: 8.1, race_drift_pct: 12.0 };
    expect(activityMatchesDriftRange(activity, 'decoupling_pct', null, 5)).toBe(true);
    expect(activityMatchesDriftRange(activity, 'decoupling_pct', 5, null)).toBe(false);
    expect(activityMatchesDriftRange(activity, 'threshold_drift_pct', 7, 9)).toBe(true);
    expect(activityMatchesDriftRange(activity, 'race_drift_pct', 10, 11)).toBe(false);
  });

  it('excludes activities without finite drift when bounds are set', () => {
    expect(activityMatchesDriftRange({ decoupling_pct: undefined }, 'decoupling_pct', null, 5)).toBe(false);
    expect(activityMatchesDriftRange({ threshold_drift_pct: 'n/a' }, 'threshold_drift_pct', 0, 10)).toBe(false);
  });

  it('passes through when no bounds are set', () => {
    expect(activityMatchesDriftRange({}, 'race_drift_pct', null, null)).toBe(true);
  });
});

describe('activityMatchesLogSearch', () => {
  const activity = {
    title: 'Morning Ride',
    date: '2024-06-15',
    description: 'Zwift race prep — <i>VO2</i> block',
  };

  it('matches empty search', () => {
    expect(activityMatchesLogSearch(activity, '')).toBe(true);
  });

  it('matches title', () => {
    expect(activityMatchesLogSearch(activity, 'morning')).toBe(true);
  });

  it('matches Strava description text with HTML stripped', () => {
    expect(activityMatchesLogSearch(activity, 'vo2')).toBe(true);
    expect(activityMatchesLogSearch(activity, 'race prep')).toBe(true);
  });

  it('matches notes when description is missing', () => {
    expect(activityMatchesLogSearch({ title: 'Ride', notes: 'Coffee stop at Geraardsbergen' }, 'geraardsbergen')).toBe(true);
  });

  it('matches ISO date fragments', () => {
    expect(activityMatchesLogSearch(activity, '2024-06')).toBe(true);
    expect(activityMatchesLogSearch(activity, '15-6-2024')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(activityMatchesLogSearch(activity, 'gravel')).toBe(false);
  });
});
