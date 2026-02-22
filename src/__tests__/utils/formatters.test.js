/**
 * Tests for src/utils/formatters.js
 * Priority: HIGH — wrong dates = misplaced activities on timeline
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  formatDateDDMMYYYY,
  formatTime,
  parseDurationToSeconds,
} from '../../utils/formatters';

// ─── normalizeDate ──────────────────────────────────────────────────────────

describe('normalizeDate', () => {
  it('strips time from ISO datetime', () => {
    expect(normalizeDate('2025-06-15T08:30:00Z')).toBe('2025-06-15');
    expect(normalizeDate('2025-06-15T00:00:00+02:00')).toBe('2025-06-15');
  });

  it('converts EU date DD/MM/YYYY to ISO', () => {
    expect(normalizeDate('15/06/2025')).toBe('2025-06-15');
    expect(normalizeDate('1/1/2025')).toBe('2025-01-01');
    expect(normalizeDate('09/02/2026')).toBe('2026-02-09');
  });

  it('passes through already-ISO dates', () => {
    expect(normalizeDate('2025-06-15')).toBe('2025-06-15');
  });

  it('returns today for null/undefined', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(normalizeDate(null)).toBe(today);
    expect(normalizeDate(undefined)).toBe(today);
    expect(normalizeDate('')).toBe(today);
  });

  it('handles DD-MM-YYYY with dashes', () => {
    expect(normalizeDate('15-06-2025')).toBe('2025-06-15');
  });

  it('pads single-digit month/day', () => {
    expect(normalizeDate('5/6/2025')).toBe('2025-06-05');
  });
});

// ─── formatDateDDMMYYYY ─────────────────────────────────────────────────────

describe('formatDateDDMMYYYY', () => {
  it('formats ISO date to nl-NL style', () => {
    const result = formatDateDDMMYYYY('2025-06-15');
    // nl-NL: "15-06-2025"
    expect(result).toMatch(/15.06.2025/);
  });

  it('returns - for null/undefined', () => {
    expect(formatDateDDMMYYYY(null)).toBe('-');
    expect(formatDateDDMMYYYY(undefined)).toBe('-');
  });

  it('handles ISO datetime string', () => {
    const result = formatDateDDMMYYYY('2025-12-25T10:00:00Z');
    expect(result).toMatch(/25.12.2025/);
  });
});

// ─── formatTime ─────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats seconds to HH:MM:SS', () => {
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7200)).toBe('2:00:00');
  });

  it('formats short durations without hours', () => {
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(0)).toBe('00:00');
  });

  it('handles null/NaN', () => {
    expect(formatTime(null)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
    expect(formatTime(undefined)).toBe('00:00');
    expect(formatTime('not a number')).toBe('00:00');
  });

  it('handles string number input', () => {
    expect(formatTime('3600')).toBe('1:00:00');
  });

  it('pads minutes and seconds', () => {
    expect(formatTime(61)).toBe('01:01');
    expect(formatTime(3601)).toBe('1:00:01');
  });
});

// ─── parseDurationToSeconds ─────────────────────────────────────────────────

describe('parseDurationToSeconds', () => {
  it('parses H:MM:SS format', () => {
    expect(parseDurationToSeconds('2:30:15')).toBe(9015);
    expect(parseDurationToSeconds('1:00:00')).toBe(3600);
    expect(parseDurationToSeconds('0:45:00')).toBe(2700);
  });

  it('parses MM:SS format', () => {
    expect(parseDurationToSeconds('45:00')).toBe(2700);
    expect(parseDurationToSeconds('5:30')).toBe(330);
  });

  it('parses Xh Xm Xs format', () => {
    expect(parseDurationToSeconds('2h30m15s')).toBe(9015);
    expect(parseDurationToSeconds('1h')).toBe(3600);
    expect(parseDurationToSeconds('45m')).toBe(2700);
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('1h30m')).toBe(5400);
  });

  it('handles plain number (already seconds)', () => {
    expect(parseDurationToSeconds(3600)).toBe(3600);
  });

  it('handles numeric string with comma decimal', () => {
    expect(parseDurationToSeconds('3600,5')).toBeCloseTo(3600.5);
  });

  it('returns 0 for null/empty', () => {
    expect(parseDurationToSeconds(null)).toBe(0);
    expect(parseDurationToSeconds(undefined)).toBe(0);
    expect(parseDurationToSeconds('')).toBe(0);
  });
});
