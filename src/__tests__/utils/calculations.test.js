/**
 * Tests for src/utils/calculations.js
 * Priority: CRITICAL — wrong values here = wrong training advice
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePowerZones,
  getPowerZone,
  calculateBassettCorrection,
  calculateFerrariWatts,
  calculateRollingTrend,
  calculateClimbCategory,
} from '../../utils/calculations';

// ─── POWER ZONES (Coggan Model) ─────────────────────────────────────────────

describe('calculatePowerZones', () => {
  it('returns 7 zones for a valid FTP', () => {
    const zones = calculatePowerZones(250);
    expect(zones).toHaveLength(7);
    expect(zones[0].id).toBe('Z1');
    expect(zones[6].id).toBe('Z7');
  });

  it('returns empty for FTP=0, null, negative', () => {
    expect(calculatePowerZones(0)).toEqual([]);
    expect(calculatePowerZones(null)).toEqual([]);
    expect(calculatePowerZones(-10)).toEqual([]);
    expect(calculatePowerZones(undefined)).toEqual([]);
  });

  it('produces correct Coggan boundaries for FTP=200', () => {
    const zones = calculatePowerZones(200);
    // Z1: 0 - 55% = 0-110
    expect(zones[0]).toMatchObject({ id: 'Z1', min: 0, max: 110 });
    // Z2: 56-75% = 112-150
    expect(zones[1]).toMatchObject({ id: 'Z2', min: 112, max: 150 });
    // Z3: 76-90% = 152-180
    expect(zones[2]).toMatchObject({ id: 'Z3', min: 152, max: 180 });
    // Z4: 91-105% = 182-210
    expect(zones[3]).toMatchObject({ id: 'Z4', min: 182, max: 210 });
    // Z5: 106-120% = 212-240
    expect(zones[4]).toMatchObject({ id: 'Z5', min: 212, max: 240 });
    // Z6: 121-150% = 242-300
    expect(zones[5]).toMatchObject({ id: 'Z6', min: 242, max: 300 });
    // Z7: 151%+ = 302-9999
    expect(zones[6]).toMatchObject({ id: 'Z7', min: 302, max: 9999 });
  });

  it('produces correct boundaries for FTP=300 (strong rider)', () => {
    const zones = calculatePowerZones(300);
    expect(zones[0].max).toBe(Math.round(300 * 0.55)); // 165
    expect(zones[3].min).toBe(Math.round(300 * 0.91)); // 273
    expect(zones[3].max).toBe(Math.round(300 * 1.05)); // 315
  });

  it('zones have no gaps (max[n] + 1 == min[n+1])', () => {
    const zones = calculatePowerZones(280);
    for (let i = 0; i < zones.length - 1; i++) {
      expect(zones[i + 1].min).toBe(zones[i].max + 1);
    }
  });

  it('works for very low FTP (beginner)', () => {
    const zones = calculatePowerZones(80);
    expect(zones).toHaveLength(7);
    expect(zones[0].max).toBe(Math.round(80 * 0.55));
  });

  it('works for very high FTP (pro)', () => {
    const zones = calculatePowerZones(420);
    expect(zones).toHaveLength(7);
    expect(zones[3].min).toBe(Math.round(420 * 0.91));
  });
});

describe('getPowerZone', () => {
  it('correctly classifies watts in each zone (FTP=200)', () => {
    expect(getPowerZone(100, 200).id).toBe('Z1');
    expect(getPowerZone(130, 200).id).toBe('Z2');
    expect(getPowerZone(165, 200).id).toBe('Z3');
    expect(getPowerZone(195, 200).id).toBe('Z4');
    expect(getPowerZone(220, 200).id).toBe('Z5');
    expect(getPowerZone(260, 200).id).toBe('Z6');
    expect(getPowerZone(350, 200).id).toBe('Z7');
  });

  it('returns null for missing inputs', () => {
    expect(getPowerZone(0, 200)).toBeNull();
    expect(getPowerZone(null, 200)).toBeNull();
    expect(getPowerZone(200, 0)).toBeNull();
    expect(getPowerZone(undefined, undefined)).toBeNull();
  });

  it('classifies boundary values correctly', () => {
    const z = getPowerZone(110, 200); // Exactly Z1 max
    expect(z.id).toBe('Z1');
    const z2 = getPowerZone(112, 200); // Exactly Z2 min
    expect(z2.id).toBe('Z2');
  });

  it('very high watts fall into Z7', () => {
    const z = getPowerZone(9999, 200);
    expect(z.id).toBe('Z7');
  });

  it('watt above Z7 max still returns Z7 (fallback)', () => {
    const z = getPowerZone(15000, 200);
    expect(z.id).toBe('Z7');
  });
});

// ─── SCIENCE MODELS ──────────────────────────────────────────────────────────

describe('calculateBassettCorrection', () => {
  it('returns original watts below 1000m', () => {
    expect(calculateBassettCorrection(250, 500)).toBe(250);
    expect(calculateBassettCorrection(250, 999)).toBe(250);
    expect(calculateBassettCorrection(250, 0)).toBe(250);
  });

  it('applies correction above 1000m', () => {
    // At 2000m: correctionFactor = 1 + (1000/100 * 0.01) = 1.10
    const corrected = calculateBassettCorrection(250, 2000);
    expect(corrected).toBe(Math.round(250 * 1.10));
  });

  it('scales linearly with altitude', () => {
    const at1500 = calculateBassettCorrection(200, 1500);
    const at2500 = calculateBassettCorrection(200, 2500);
    expect(at2500).toBeGreaterThan(at1500);
  });

  it('handles null/undefined gracefully', () => {
    expect(calculateBassettCorrection(null, 2000)).toBeNull();
    expect(calculateBassettCorrection(250, null)).toBe(250);
    expect(calculateBassettCorrection(undefined, 2000)).toBeUndefined();
  });

  it('returns integer (rounded)', () => {
    const result = calculateBassettCorrection(233, 1550);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('calculateFerrariWatts', () => {
  it('computes W/kg without totalWeight', () => {
    // VAM=1200, gradient=8% → 1200 / (200 + 80) = 4.29 W/kg
    const wkg = calculateFerrariWatts(1200, 8);
    expect(wkg).toBeCloseTo(4.29, 1);
  });

  it('computes total watts with totalWeight', () => {
    // 4.29 W/kg * 75kg = 321W
    const watts = calculateFerrariWatts(1200, 8, 75);
    expect(watts).toBe(Math.round((1200 / 280) * 75));
  });

  it('returns 0 for missing inputs', () => {
    expect(calculateFerrariWatts(null, 8)).toBe(0);
    expect(calculateFerrariWatts(1200, null)).toBe(0);
    expect(calculateFerrariWatts(0, 8)).toBe(0);
    expect(calculateFerrariWatts(1200, 0)).toBe(0);
  });

  it('handles steep gradients correctly', () => {
    // VAM=800, gradient=15% → 800 / (200 + 150) = 2.29 W/kg
    const wkg = calculateFerrariWatts(800, 15);
    expect(wkg).toBeCloseTo(2.29, 1);
  });

  it('handles flat gradients', () => {
    // VAM=600, gradient=2% → 600 / (200 + 20) = 2.73
    const wkg = calculateFerrariWatts(600, 2);
    expect(wkg).toBeCloseTo(2.73, 1);
  });
});

// ─── ROLLING TREND ───────────────────────────────────────────────────────────

describe('calculateRollingTrend', () => {
  const activities = [
    { date: '2025-06-01', avg_power: 200 },
    { date: '2025-06-03', avg_power: 210 },
    { date: '2025-06-05', avg_power: 220 },
    { date: '2025-06-07', avg_power: 230 },
    { date: '2025-06-10', avg_power: 240 },
    { date: '2025-06-20', avg_power: 300 }, // Outside 15-day window from June 5
  ];

  it('averages activities within window', () => {
    const avg = calculateRollingTrend(activities, '2025-06-05', 'avg_power', 5);
    // Within 5 days of June 5: June 1, 3, 5 → (200+210+220)/3 = 210
    expect(avg).toBeCloseTo(210, 0);
  });

  it('returns 0 for empty window', () => {
    const avg = calculateRollingTrend(activities, '2025-01-01', 'avg_power', 5);
    expect(avg).toBe(0);
  });

  it('returns 0 for empty activities array', () => {
    expect(calculateRollingTrend([], '2025-06-05', 'avg_power', 5)).toBe(0);
  });

  it('ignores zero/NaN metric values', () => {
    const acts = [
      { date: '2025-06-05', avg_power: 200 },
      { date: '2025-06-06', avg_power: 0 },
      { date: '2025-06-07', avg_power: 300 },
    ];
    const avg = calculateRollingTrend(acts, '2025-06-06', 'avg_power', 3);
    // Only June 5 and 7 have valid power → (200+300)/2 = 250
    expect(avg).toBeCloseTo(250, 0);
  });
});

// ─── CLIMB CATEGORIZATION ────────────────────────────────────────────────────

describe('calculateClimbCategory', () => {
  it('categorizes HC: very long & steep', () => {
    // 20km * 7% = 140 → HC
    const cat = calculateClimbCategory(20, 7);
    expect(cat.label).toBe('HC');
    expect(cat.score).toBeGreaterThan(100);
  });

  it('categorizes HC: long + moderate (special rule)', () => {
    // 16km * 6.5% = 104, but also triggers length>15 && grade>6 rule
    const cat = calculateClimbCategory(16, 6.5);
    expect(cat.label).toBe('HC');
  });

  it('categorizes Cat 1: score > 60', () => {
    // 10km * 7% = 70 → Cat 1
    const cat = calculateClimbCategory(10, 7);
    expect(cat.label).toBe('1');
  });

  it('categorizes Cat 2: score > 35', () => {
    // 8km * 5% = 40 → Cat 2
    const cat = calculateClimbCategory(8, 5);
    expect(cat.label).toBe('2');
  });

  it('categorizes Cat 3: score > 16', () => {
    // 4km * 5% = 20 → Cat 3
    const cat = calculateClimbCategory(4, 5);
    expect(cat.label).toBe('3');
  });

  it('categorizes Cat 4: score <= 16', () => {
    // 2km * 4% = 8 → Cat 4
    const cat = calculateClimbCategory(2, 4);
    expect(cat.label).toBe('4');
  });

  it('applies 1.25x bump for >10% gradient', () => {
    // 5km * 12% = 60, then * 1.25 = 75 → Cat 1
    const cat = calculateClimbCategory(5, 12);
    expect(cat.score).toBe(5 * 12 * 1.25);
    expect(cat.label).toBe('1');
  });

  it('returns - for null/zero inputs', () => {
    expect(calculateClimbCategory(0, 5).label).toBe('-');
    expect(calculateClimbCategory(5, 0).label).toBe('-');
    expect(calculateClimbCategory(null, null).label).toBe('-');
    expect(calculateClimbCategory(undefined, 5).label).toBe('-');
  });

  it('known climbs match expected categories', () => {
    // Alpe d'Huez: ~13.8km, 8.1% → score 111.78 → HC
    expect(calculateClimbCategory(13.8, 8.1).label).toBe('HC');
    // Mont Ventoux (Bedoin): ~21.5km, 7.5% → HC
    expect(calculateClimbCategory(21.5, 7.5).label).toBe('HC');
    // Short Dutch "berg": 1km, 5% → score 5 → Cat 4
    expect(calculateClimbCategory(1, 5).label).toBe('4');
  });
});
