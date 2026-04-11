/**
 * Tests for src/utils/intervals.js
 * Priority: CRITICAL — wrong normalization = lost power data
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeIntervalsActivity } from '../../utils/intervals';

const fixturesDir = resolve(__dirname, '../fixtures');
const fixture = JSON.parse(readFileSync(resolve(fixturesDir, 'sample-intervals-api.json'), 'utf-8'));

// ─── FIELD EXTRACTION & FALLBACKS ────────────────────────────────────────────

describe('normalizeIntervalsActivity - field extraction', () => {
  it('extracts from primary field names (activity 0)', () => {
    const norm = normalizeIntervalsActivity(fixture[0]);
    expect(norm.id).toBe('i12345');
    expect(norm.date).toBe('2025-06-15');
    expect(norm.title).toBe('Morning Ride - Col du Galibier');
    expect(norm.moving_time).toBe(7200);
    expect(norm.avg_power).toBe(218);
    expect(norm.norm_power).toBe(245);
    expect(norm.avg_hr).toBe(152);
    expect(norm.load).toBe(185);
    expect(norm.ftp).toBe(280);
    expect(norm.max_power).toBe(650);
    expect(norm.max_hr).toBe(178);
  });

  it('extracts from secondary field names (activity 1)', () => {
    const norm = normalizeIntervalsActivity(fixture[1]);
    expect(norm.date).toBe('2025-06-16');
    expect(norm.avg_power).toBe(195);    // average_watts
    expect(norm.norm_power).toBe(210);   // weighted_average_watts
    expect(norm.avg_hr).toBe(145);       // avg_hr
    expect(norm.load).toBe(95);          // training_load
    expect(norm.max_power).toBe(580);    // max_watts
    expect(norm.max_hr).toBe(168);       // max_hr
  });

  it('extracts from tertiary field names (activity 2)', () => {
    const norm = normalizeIntervalsActivity(fixture[2]);
    expect(norm.title).toBe('Easy Recovery on Rouvy');  // title not name
    expect(norm.avg_power).toBe(140);                   // device_watts
    expect(norm.norm_power).toBe(155);                  // normalized_power
    expect(norm.avg_hr).toBe(128);                      // icu_average_heartrate
    expect(norm.load).toBe(55);                         // power_load
    expect(norm.ftp).toBe(280);                         // icu_pm_ftp
    expect(norm.avg_altitude).toBe(300);
    expect(norm.max_altitude).toBe(350);
  });

  it('uses activity_id when id is missing', () => {
    const norm = normalizeIntervalsActivity(fixture[3]);
    expect(norm.id).toBe('i12348');
  });

  it('handles sparse data without crashing', () => {
    const norm = normalizeIntervalsActivity(fixture[3]);
    expect(norm.date).toBe('2025-06-18');
    expect(norm.title).toBe('Sparse Data Ride');
    expect(norm.moving_time).toBe(5400);
    expect(norm.avg_power).toBe(0);
    expect(norm.avg_hr).toBe(0);
    expect(norm.norm_power).toBe(0);
    expect(norm.load).toBe(0);
  });
});

// ─── BEST POWER FIELDS ──────────────────────────────────────────────────────

describe('normalizeIntervalsActivity - best power', () => {
  it('extracts PascalCase best power (Best1minpower)', () => {
    const norm = normalizeIntervalsActivity(fixture[0]);
    expect(norm.best_1min).toBe(420);
    expect(norm.best_5min).toBe(340);
    expect(norm.best_10min).toBe(305);
    expect(norm.best_20min).toBe(275);
    expect(norm.best_60min).toBe(250);
  });

  it('extracts snake_case best power (best_1min)', () => {
    const norm = normalizeIntervalsActivity(fixture[1]);
    expect(norm.best_1min).toBe(380);
    expect(norm.best_5min).toBe(310);
    expect(norm.best_10min).toBe(270);
    expect(norm.best_20min).toBe(245);
    expect(norm.best_60min).toBe(0);
  });

  it('extracts underscore-variant best power (best_1min_power)', () => {
    const norm = normalizeIntervalsActivity(fixture[2]);
    expect(norm.best_1min).toBe(290);
    expect(norm.best_5min).toBe(200);
    expect(norm.best_10min).toBe(170);
    expect(norm.best_20min).toBe(155);
    expect(norm.best_60min).toBe(0);
  });
});

// ─── SANITY CHECKS ──────────────────────────────────────────────────────────

describe('normalizeIntervalsActivity - sanity checks', () => {
  it('filters insane best_1min > 1200W to 0', () => {
    const norm = normalizeIntervalsActivity(fixture[4]);
    expect(norm.best_1min).toBe(0); // 1700W is filtered
  });

  it('uses best_1min as max_power fallback when max is 0', () => {
    // Activity 4 has icu_max_watts: 0 and best_1min: 1700 (filtered) → max_power stays 0
    const norm = normalizeIntervalsActivity(fixture[4]);
    // best_1min was 1700 → filtered to 0, and icu_max_watts is 0
    // So max_power should be 0 (no valid fallback)
    expect(norm.max_power).toBe(0);
  });

  it('uses valid best_1min (<=1200) as max_power when max is missing', () => {
    const activity = {
      id: 'fallback_test',
      startDate: '2025-06-20',
      name: 'Fallback Test',
      type: 'Ride',
      movingTime: 3600,
      distance: 40000,
      best_1min: 450,
      // No max_power fields at all
    };
    const norm = normalizeIntervalsActivity(activity);
    expect(norm.max_power).toBe(450);
    expect(norm.max_power_source).toBe('1 min');
  });

  it('uses icu_intervals max_watts as fallback', () => {
    // Activity 2: icu_pm_p_max = 0, but has icu_intervals with max 350
    const norm = normalizeIntervalsActivity(fixture[2]);
    expect(norm.max_power).toBe(350);
    expect(norm.max_power_source).toBe('Interval');
  });
});

// ─── WORK (kJ) CALCULATION ──────────────────────────────────────────────────

describe('normalizeIntervalsActivity - work/kJ', () => {
  it('uses icu_joules when work fields are missing', () => {
    // Activity 0: icu_joules=1569600 → 1569.6 → round to 1570 kJ
    const norm = normalizeIntervalsActivity(fixture[0]);
    expect(norm.work).toBe(1570);
  });

  it('uses direct work field when available', () => {
    // Activity 1: work=702
    const norm = normalizeIntervalsActivity(fixture[1]);
    expect(norm.work).toBe(702);
  });

  it('uses kilojoules field', () => {
    // Activity 2: kilojoules=378
    const norm = normalizeIntervalsActivity(fixture[2]);
    expect(norm.work).toBe(378);
  });

  it('calculates work from avg_power * time when nothing else available', () => {
    // Activity 3 has no work/joules fields, but has sparse data
    // avgPower=0, so work should be 0
    const norm = normalizeIntervalsActivity(fixture[3]);
    expect(norm.work).toBe(0);
  });

  it('calculates work as fallback: avgPower * movingTime / 1000', () => {
    const activity = {
      id: 'calc_test',
      startDate: '2025-06-20',
      name: 'Calc Test',
      type: 'Ride',
      movingTime: 3600,
      icu_average_watts: 200,
      // No work, joules, or kilojoules fields
    };
    const norm = normalizeIntervalsActivity(activity);
    // 200W * 3600s / 1000 = 720 kJ
    expect(norm.work).toBe(720);
  });
});

// ─── DISTANCE CONVERSION ─────────────────────────────────────────────────────

describe('normalizeIntervalsActivity - distance', () => {
  it('converts meters to km when > 1000', () => {
    const norm = normalizeIntervalsActivity(fixture[0]);
    // distance: 85000 → 85.00
    expect(parseFloat(norm.distance)).toBeCloseTo(85.0, 0);
  });

  it('converts sub-km distances from meters to km', () => {
    const activity = {
      id: 'short', startDate: '2025-06-01', name: 'Short', type: 'Ride',
      movingTime: 600, distance: 500,
    };
    const norm = normalizeIntervalsActivity(activity);
    expect(norm.distance).toBe(0.5);
  });
});

// ─── SPEED CONVERSION ────────────────────────────────────────────────────────

describe('normalizeIntervalsActivity - speed', () => {
  it('converts m/s to km/h when < 15', () => {
    const norm = normalizeIntervalsActivity(fixture[0]);
    // avg_speed: 11.8 m/s → 42.48 km/h
    expect(parseFloat(norm.avg_speed)).toBeCloseTo(42.5, 0);
  });

  it('leaves high values (already km/h) as-is', () => {
    const activity = {
      id: 'fast', startDate: '2025-06-01', name: 'Fast', type: 'Ride',
      movingTime: 3600, distance: 100000, avg_speed: 35,
    };
    const norm = normalizeIntervalsActivity(activity);
    expect(norm.avg_speed).toBe(35);
  });
});

// ─── EMPTY / MINIMAL INPUT ──────────────────────────────────────────────────

describe('normalizeIntervalsActivity - edge cases', () => {
  it('handles completely empty object', () => {
    const norm = normalizeIntervalsActivity({});
    expect(norm.title).toBe('Untitled');
    expect(norm.type).toBe('Ride');
    expect(norm.avg_power).toBe(0);
    expect(norm.moving_time).toBe(0);
    expect(norm.id).toBeTruthy(); // random generated
  });

  it('generates ID when none provided', () => {
    const norm = normalizeIntervalsActivity({ name: 'No ID ride' });
    expect(norm.id).toBeTruthy();
    expect(norm.id.length).toBeGreaterThan(0);
  });

  it('all numeric fields are actual numbers (not strings)', () => {
    const norm = normalizeIntervalsActivity(fixture[0]);
    const numericFields = [
      'moving_time', 'climbing', 'norm_power', 'avg_power',
      'avg_hr', 'load', 'work', 'ftp', 'max_power', 'max_hr',
      'best_1min', 'best_5min', 'best_10min', 'best_20min', 'best_60min',
      'best_90min', 'best_120min',
      'avg_altitude', 'max_altitude'
    ];
    for (const field of numericFields) {
      expect(typeof norm[field]).toBe('number');
    }
  });
});