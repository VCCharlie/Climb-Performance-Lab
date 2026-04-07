import { describe, it, expect } from 'vitest';
import {
  activityDistanceKm,
  activityMovingTimeSec,
  activityAvgSpeedKmh,
  parseNumericBound,
  inNumericRange,
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
