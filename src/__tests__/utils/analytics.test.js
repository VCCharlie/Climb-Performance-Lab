/**
 * Tests for src/utils/analytics.js
 * Priority: HIGH — wrong trends = misleading charts
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRollingAverage,
  calculateTrendLine,
  enrichChartData,
} from '../../utils/analytics';

// ─── ROLLING AVERAGE ─────────────────────────────────────────────────────────

describe('calculateRollingAverage', () => {
  const data = [
    { date: '2025-06-01', ftp: 250, load: 100 },
    { date: '2025-06-02', ftp: 252, load: 120 },
    { date: '2025-06-03', ftp: 254, load: 80 },
    { date: '2025-06-04', ftp: 256, load: 140 },
    { date: '2025-06-05', ftp: 258, load: 90 },
  ];

  it('computes rolling avg with window=3', () => {
    const result = calculateRollingAverage(data, 'ftp', 3);
    // Index 0: just [250] → 250
    expect(result[0].ftp_avg).toBe(250);
    // Index 1: [250, 252] → 251
    expect(result[1].ftp_avg).toBe(251);
    // Index 2: [250, 252, 254] → 252
    expect(result[2].ftp_avg).toBe(252);
    // Index 3: [252, 254, 256] → 254
    expect(result[3].ftp_avg).toBe(254);
    // Index 4: [254, 256, 258] → 256
    expect(result[4].ftp_avg).toBe(256);
  });

  it('handles window larger than dataset', () => {
    const result = calculateRollingAverage(data, 'ftp', 100);
    // Should still compute avg of all available points up to each index
    expect(result[0].ftp_avg).toBe(250);
    expect(result[4].ftp_avg).toBe(Math.round((250 + 252 + 254 + 256 + 258) / 5));
  });

  it('returns empty for empty input', () => {
    expect(calculateRollingAverage([], 'ftp', 3)).toEqual([]);
    expect(calculateRollingAverage(null, 'ftp', 3)).toEqual([]);
  });

  it('treats missing metric as 0', () => {
    const sparse = [
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-06-02' },  // no ftp
      { date: '2025-06-03', ftp: 260 },
    ];
    const result = calculateRollingAverage(sparse, 'ftp', 3);
    // [250, 0, 260] → avg = 170
    expect(result[2].ftp_avg).toBe(Math.round((250 + 0 + 260) / 3));
  });

  it('preserves original data fields', () => {
    const result = calculateRollingAverage(data, 'ftp', 3);
    expect(result[0].date).toBeTruthy();
    expect(result[0].ftp).toBe(250);
    expect(result[0].load).toBe(100);
  });

  it('sorts by date', () => {
    const unsorted = [
      { date: '2025-06-05', ftp: 258 },
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-06-03', ftp: 254 },
    ];
    const result = calculateRollingAverage(unsorted, 'ftp', 3);
    expect(result[0].ftp).toBe(250); // Earliest first
    expect(result[2].ftp).toBe(258); // Latest last
  });
});

// ─── TREND LINE ──────────────────────────────────────────────────────────────

describe('calculateTrendLine', () => {
  it('adds trend values to data', () => {
    const data = [
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-06-15', ftp: 260 },
      { date: '2025-06-30', ftp: 270 },
    ];
    const result = calculateTrendLine(data, 'ftp');
    expect(result[0]).toHaveProperty('ftp_trend');
    expect(result[1]).toHaveProperty('ftp_trend');
    expect(result[2]).toHaveProperty('ftp_trend');
  });

  it('trend increases for upward data', () => {
    const data = [
      { date: '2025-01-01', ftp: 200 },
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-12-01', ftp: 300 },
    ];
    const result = calculateTrendLine(data, 'ftp');
    expect(result[2].ftp_trend).toBeGreaterThan(result[0].ftp_trend);
  });

  it('trend decreases for downward data', () => {
    const data = [
      { date: '2025-01-01', ftp: 300 },
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-12-01', ftp: 200 },
    ];
    const result = calculateTrendLine(data, 'ftp');
    expect(result[2].ftp_trend).toBeLessThan(result[0].ftp_trend);
  });

  it('returns data as-is for < 2 points', () => {
    const data = [{ date: '2025-06-01', ftp: 250 }];
    const result = calculateTrendLine(data, 'ftp');
    expect(result).toEqual(data);
  });

  it('handles null/undefined', () => {
    expect(calculateTrendLine(null, 'ftp')).toBeNull();
    expect(calculateTrendLine(undefined, 'ftp')).toBeUndefined();
  });

  it('preserves original fields', () => {
    const data = [
      { date: '2025-06-01', ftp: 250, load: 100 },
      { date: '2025-06-15', ftp: 260, load: 120 },
    ];
    const result = calculateTrendLine(data, 'ftp');
    expect(result[0].load).toBe(100);
  });

  it('returns flat trend when all timestamps are identical', () => {
    const data = [
      { date: '2025-06-01', ftp: 250 },
      { date: '2025-06-01', ftp: 260 },
      { date: '2025-06-01', ftp: 270 },
    ];
    const result = calculateTrendLine(data, 'ftp');
    expect(result.every((row) => row.ftp_trend === 260)).toBe(true);
    expect(result.every((row) => Number.isFinite(row.ftp_trend))).toBe(true);
  });
});

// ─── enrichChartData ─────────────────────────────────────────────────────────

describe('enrichChartData', () => {
  const data = [
    { date: '2025-06-01', ftp: 250, eFTP: 245, load: 100 },
    { date: '2025-06-15', ftp: 260, eFTP: 255, load: 120 },
    { date: '2025-06-30', ftp: 270, eFTP: 265, load: 110 },
  ];

  it('adds rolling avg for ftp and eFTP', () => {
    const result = enrichChartData(data);
    expect(result[0]).toHaveProperty('ftp_avg');
    expect(result[0]).toHaveProperty('eFTP_avg');
  });

  it('adds trend for ftp, eFTP, and load', () => {
    const result = enrichChartData(data);
    expect(result[0]).toHaveProperty('ftp_trend');
    expect(result[0]).toHaveProperty('eFTP_trend');
    expect(result[0]).toHaveProperty('load_trend');
  });

  it('converts date strings to timestamps', () => {
    const result = enrichChartData(data);
    expect(typeof result[0].date).toBe('number');
  });

  it('handles empty data', () => {
    expect(enrichChartData([])).toEqual([]);
  });
});
