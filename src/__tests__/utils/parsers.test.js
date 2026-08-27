/**
 * Tests for src/utils/parsers.js
 * Priority: CRITICAL — corrupted imports = garbage dashboard data
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  determineActivityType,
  cleanNumber,
  smartParseJSON,
} from '../../utils/parsers';

const fixturesDir = resolve(__dirname, '../fixtures');

// ─── cleanNumber ─────────────────────────────────────────────────────────────

describe('cleanNumber', () => {
  // Basic types
  it('returns 0 for null, undefined, empty string', () => {
    expect(cleanNumber(null)).toBe(0);
    expect(cleanNumber(undefined)).toBe(0);
    expect(cleanNumber('')).toBe(0);
  });

  it('passes through valid numbers', () => {
    expect(cleanNumber(42)).toBe(42);
    expect(cleanNumber(3.14)).toBeCloseTo(3.14);
    expect(cleanNumber(0)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(cleanNumber(NaN)).toBe(0);
  });

  // String number parsing
  it('parses plain integer strings', () => {
    expect(cleanNumber('250')).toBe(250);
    expect(cleanNumber('  42  ')).toBe(42);
  });

  it('parses US format: 1,234.56', () => {
    expect(cleanNumber('1,234.56')).toBeCloseTo(1234.56);
  });

  it('parses EU format: 1.234,56', () => {
    expect(cleanNumber('1.234,56')).toBeCloseTo(1234.56);
  });

  it('treats lone comma as decimal (EU context)', () => {
    // European context: "12,5" means 12.5
    expect(cleanNumber('12,5')).toBeCloseTo(12.5);
  });

  it('strips unit suffixes', () => {
    expect(cleanNumber('250W')).toBe(250);
    expect(cleanNumber('75kg')).toBe(75);
    expect(cleanNumber('1500m')).toBe(1500);
  });

  // Edge cases
  it('returns 0 for colon-separated values (min:max protection)', () => {
    expect(cleanNumber('635:646')).toBe(0);
  });

  it('returns 0 for garbage strings', () => {
    expect(cleanNumber('abc')).toBe(0);
    expect(cleanNumber('---')).toBe(0);
  });

  it('returns 0 for multiple decimal points', () => {
    expect(cleanNumber('1.2.3')).toBe(0);
  });

  it('handles negative numbers in strings', () => {
    expect(cleanNumber('-5')).toBe(-5);
  });

  it('handles whitespace-only strings', () => {
    expect(cleanNumber('   ')).toBe(0);
  });
});

// ─── determineActivityType ───────────────────────────────────────────────────

describe('determineActivityType', () => {
  it('identifies VirtualRide from type field', () => {
    expect(determineActivityType('VirtualRide', 'Morning ride')).toBe('VirtualRide');
    expect(determineActivityType('virtualride', '')).toBe('VirtualRide');
    expect(determineActivityType('Virtual Ride', '')).toBe('VirtualRide');
  });

  it('identifies virtual rides from title keywords', () => {
    expect(determineActivityType('Ride', 'Zwift - Volcano Flat')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'Rouvy - Col du Tourmalet')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'Indoor trainer session')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'Wahoo SYSTM workout')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'Watopia Hilly Route')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'FulGaz mountain pass')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'Bkool race')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'IndieVelo time trial')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'TACX training')).toBe('VirtualRide');
    expect(determineActivityType('Ride', 'TrainerRoad Sweet Spot')).toBe('VirtualRide');
  });

  it('preserves gravel, MTB, and e-bike types from import', () => {
    expect(determineActivityType('GravelRide', 'Forest loop')).toBe('GravelRide');
    expect(determineActivityType('Gravel Ride', 'Forest loop')).toBe('GravelRide');
    expect(determineActivityType('gravelride', '')).toBe('GravelRide');
    expect(determineActivityType('MountainBikeRide', 'Singletrack')).toBe('MountainBikeRide');
    expect(determineActivityType('Mountain Bike Ride', '')).toBe('MountainBikeRide');
    expect(determineActivityType('EBikeRide', 'Commute')).toBe('EBikeRide');
  });

  it('returns Ride for normal outdoor rides', () => {
    expect(determineActivityType('Ride', 'Morning Ride')).toBe('Ride');
    expect(determineActivityType('Ride', 'Col du Galibier')).toBe('Ride');
    expect(determineActivityType('Ride', 'Outside Zwift')).toBe('Ride');
    expect(determineActivityType('Ride', 'No Zwift today — road loop')).toBe('Ride');
  });

  it('identifies Run type', () => {
    expect(determineActivityType('Run', 'Easy jog')).toBe('Run');
    expect(determineActivityType('run', '')).toBe('Run');
  });

  it('maps winter sports to Run', () => {
    expect(determineActivityType('NordicSki', '')).toBe('Run');
    expect(determineActivityType('AlpineSki', '')).toBe('Run');
    expect(determineActivityType('IceSkate', '')).toBe('Run');
  });

  it('defaults to Ride for null/empty type', () => {
    expect(determineActivityType(null, 'Some ride')).toBe('Ride');
    expect(determineActivityType('', 'Some ride')).toBe('Ride');
    expect(determineActivityType(undefined, '')).toBe('Ride');
  });

  it('identifies Walk and Hike', () => {
    expect(determineActivityType('Walk', '')).toBe('Walk');
    expect(determineActivityType('Hike', '')).toBe('Hike');
  });
});

// ─── smartParseJSON (Intervals.icu API) ──────────────────────────────────────

describe('smartParseJSON', () => {
  const fixture = readFileSync(resolve(fixturesDir, 'sample-intervals-api.json'), 'utf-8');

  it('parses all activities from JSON fixture', () => {
    const result = smartParseJSON(fixture);
    expect(result.length).toBe(5);
  });

  it('normalizes field names from various API key formats', () => {
    const result = smartParseJSON(fixture);

    // Activity 0: uses startDate, icu_average_watts, etc.
    expect(result[0].date).toBe('2025-06-15T08:30:00.000Z');
    expect(result[0].avg_power).toBe(218);
    expect(result[0].norm_power).toBe(245);
    expect(result[0].avg_hr).toBe(152);

    // Activity 1: uses start_date_local, average_watts, avg_hr
    expect(result[1].date).toBe('2025-06-16T07:00:00.000Z');
    expect(result[1].avg_power).toBe(195);
    expect(result[1].avg_hr).toBe(145);

    // Activity 2: uses title (not name), device_watts, icu_average_heartrate
    expect(result[2].title).toBe('Easy Recovery on Rouvy');
    expect(result[2].avg_power).toBe(140);
    expect(result[2].avg_hr).toBe(128);
  });

  it('detects VirtualRide from title keywords', () => {
    const result = smartParseJSON(fixture);
    expect(result[1].type).toBe('VirtualRide'); // "Zwift - Volcano Flat"
    expect(result[2].type).toBe('VirtualRide'); // "Easy Recovery on Rouvy"
  });

  it('returns empty for invalid JSON', () => {
    expect(smartParseJSON('not json')).toEqual([]);
    expect(smartParseJSON('{invalid')).toEqual([]);
  });

  it('handles single object (not array)', () => {
    const single = JSON.stringify({
      id: 'single_1', startDate: '2025-06-01', name: 'Solo', type: 'Ride',
      movingTime: 3600, distance: 40000
    });
    const result = smartParseJSON(single);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Solo');
  });

  it('normalizes cloud-shaped payloads via normalizeIntervalsActivityFromAny', () => {
    const cloud = JSON.stringify([{
      id: 'cloud_1',
      date: '2025-06-15',
      title: 'Cloud ride',
      type: 'Ride',
      moving_time: 3600,
      distance: 42.5,
      climbing: 500,
      avg_power: 200,
      norm_power: 210,
    }]);
    const result = smartParseJSON(cloud);
    expect(result).toHaveLength(1);
    expect(result[0].distance).toBe(42.5);
    expect(result[0].avg_power).toBe(200);
    expect(result[0].title).toBe('Cloud ride');
  });
});