import { describe, it, expect } from 'vitest';
import { computeRideMilestones } from '../../utils/stravaMilestones';

describe('computeRideMilestones', () => {
  it('picks next ride milestone', () => {
    const m = computeRideMilestones(47, 0, 0);
    expect(m.rides.target).toBe(50);
    expect(m.rides.remaining).toBe(3);
  });

  it('picks next distance km milestone', () => {
    const m = computeRideMilestones(0, 120000, 0); // 120 km
    expect(m.distanceKm.targetKm).toBe(250);
  });

  it('picks next elevation milestone', () => {
    const m = computeRideMilestones(0, 0, 4200);
    expect(m.elevation.target).toBe(5000);
  });
});
