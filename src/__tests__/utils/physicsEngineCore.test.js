import { describe, it, expect } from 'vitest';
import {
  computePhysicsClimb,
  estimateSteadyTss,
  formatSignedInt,
  formatSignedDuration,
  addSecondsToTimeStr,
  horizontalDistanceDeltaInATimeAtBPace,
  horizontalDistanceDeltaInBTimeAtAPace,
  formatSignedHorizontalDelta,
  EMPTY_PHYSICS_CALC
} from '../../utils/physicsEngineCore';

const climb = { lengthKm: 10, elevation: 800, avgGrade: 8 };
const user = { weight: 70, bikeWeight: 8, ftp: 250 };

describe('computePhysicsClimb', () => {
  it('returns empty when no climb', () => {
    expect(computePhysicsClimb({
      selectedClimb: null,
      userSettings: user,
      mode: 'target',
      targetTimeStr: '1:00:00',
      targetWatts: 200,
      cda: 0.32,
      crr: 0.004,
      loss: 0.03
    })).toMatchObject(EMPTY_PHYSICS_CALC);
  });

  it('target mode produces positive power for reasonable time', () => {
    const r = computePhysicsClimb({
      selectedClimb: climb,
      userSettings: user,
      mode: 'target',
      targetTimeStr: '1:00:00',
      targetWatts: 200,
      cda: 0.32,
      crr: 0.004,
      loss: 0.03
    });
    expect(r.watts).toBeGreaterThan(100);
    expect(r.seconds).toBe(3600);
    expect(r.zone).toBeTruthy();
    expect(r.ifRatio).toBeGreaterThan(0);
  });

  it('slower target time lowers power', () => {
    const fast = computePhysicsClimb({
      selectedClimb: climb,
      userSettings: user,
      mode: 'target',
      targetTimeStr: '0:45:00',
      targetWatts: 200,
      cda: 0.32,
      crr: 0.004,
      loss: 0.03
    });
    const slow = computePhysicsClimb({
      selectedClimb: climb,
      userSettings: user,
      mode: 'target',
      targetTimeStr: '1:00:00',
      targetWatts: 200,
      cda: 0.32,
      crr: 0.004,
      loss: 0.03
    });
    expect(slow.watts).toBeLessThan(fast.watts);
  });
});

describe('estimateSteadyTss', () => {
  it('returns 0 for bad input', () => {
    expect(estimateSteadyTss(0, 200, 250)).toBe(0);
  });

  it('matches ~100 for 1h at FTP', () => {
    const t = estimateSteadyTss(3600, 250, 250);
    expect(t).toBeGreaterThanOrEqual(95);
    expect(t).toBeLessThanOrEqual(105);
  });
});

describe('formatSignedInt', () => {
  it('formats signed integers', () => {
    expect(formatSignedInt(5)).toBe('+5');
    expect(formatSignedInt(-3)).toBe('-3');
    expect(formatSignedInt(0)).toBe('0');
  });
});

describe('addSecondsToTimeStr', () => {
  it('adds seconds', () => {
    expect(addSecondsToTimeStr('59:00', 60)).toBe('01:00:00');
  });
});

describe('formatSignedDuration', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatSignedDuration(90)).toBe('+1:30');
    expect(formatSignedDuration(-3665)).toBe('-1:01:05');
  });
});

describe('horizontal distance deltas (same climb length)', () => {
  it('positive when B is faster: extra road in A time at B pace', () => {
    const d = 10000;
    const tA = 3600;
    const tB = 3000;
    expect(horizontalDistanceDeltaInATimeAtBPace(d, tA, tB)).toBeCloseTo(2000, 5);
  });

  it('symmetric second perspective', () => {
    const d = 10000;
    const tA = 3600;
    const tB = 3000;
    expect(horizontalDistanceDeltaInBTimeAtAPace(d, tA, tB)).toBeCloseTo(-1666.67, 1);
  });
});

describe('formatSignedHorizontalDelta', () => {
  it('uses m for small values', () => {
    expect(formatSignedHorizontalDelta(450)).toBe('+450 m');
    expect(formatSignedHorizontalDelta(-200)).toBe('-200 m');
  });

  it('uses km for large values', () => {
    expect(formatSignedHorizontalDelta(1500)).toContain('km');
    expect(formatSignedHorizontalDelta(1500)).toContain('+');
  });
});
