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
  smartParseCSV,
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

// ─── smartParseCSV ───────────────────────────────────────────────────────────

describe('smartParseCSV', () => {
  it('returns empty for null/empty input', () => {
    expect(smartParseCSV(null)).toEqual([]);
    expect(smartParseCSV('')).toEqual([]);
    expect(smartParseCSV('   ')).toEqual([]);
  });

  it('parses EU semicolon-delimited CSV', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-eu.csv'), 'utf-8');
    const result = smartParseCSV(csv);

    expect(result.length).toBe(3);
    expect(result[0].title).toBe('Morning Road Ride');
    expect(result[0].type).toBe('Ride');
    expect(result[0].avg_power).toBe(218);
  });

  it('parses US comma-delimited CSV', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);

    expect(result.length).toBe(3);
    expect(result[0].title).toBe('Mountain Pass Ride');
    expect(result[0].avg_power).toBe(218);
    expect(result[0].norm_power).toBe(245);
  });

  it('detects VirtualRide type from type column', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    expect(result[1].type).toBe('VirtualRide');
  });

  it('parses moving time as seconds', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    // 2:30:15 = 9015s
    expect(result[0].moving_time).toBe(9015);
    // 1:00:00 = 3600s
    expect(result[1].moving_time).toBe(3600);
  });

  it('normalizes date formats', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-eu.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    // EU date 15/06/2025 → 2025-06-15
    expect(result[0].date).toBe('2025-06-15');
  });

  it('assigns unique IDs to all entries', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    const ids = result.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles quoted fields with commas inside', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    // "Short, Easy Spin" should be parsed correctly
    expect(result[2].title).toBe('Short, Easy Spin');
  });

  it('handles BOM character at start', () => {
    const csv = '\uFEFFDate,Name,Distance\n2025-06-01,Test,50';
    const result = smartParseCSV(csv);
    expect(result.length).toBe(1);
  });

  it('handles sep= header (Excel export)', () => {
    const csv = 'sep=;\nDate;Name;Distance\n2025-06-01;Test;50';
    const result = smartParseCSV(csv);
    expect(result.length).toBe(1);
  });

  it('converts Joules to kJ when mapped to joules header', () => {
    const csv = 'Date,Name,Distance,Energy\n2025-06-01,Test,50,500000';
    const result = smartParseCSV(csv);
    expect(result[0].work).toBe(500); // 500000 J = 500 kJ
  });

  it('filters out empty activities (no distance and no time)', () => {
    const csv = 'Date,Name,Distance,Moving Time\n2025-06-01,Empty,0,0\n2025-06-02,Valid,50,1:00:00';
    const result = smartParseCSV(csv);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Valid');
  });

  it('converts distance > 2000 from meters to km', () => {
    const csv = 'Date,Name,Distance\n2025-06-01,Metric,85000';
    const result = smartParseCSV(csv);
    expect(parseFloat(result[0].distance)).toBeCloseTo(85.0, 0);
  });

  it('converts avg_speed < 15 from m/s to km/h', () => {
    const csv = 'Date,Name,Distance,Average Speed\n2025-06-01,Test,50,8.33';
    const result = smartParseCSV(csv);
    // 8.33 m/s * 3.6 = ~30 km/h
    expect(parseFloat(result[0].avg_speed)).toBeCloseTo(30, 0);
  });

  it('parses best power columns', () => {
    const csv = readFileSync(resolve(fixturesDir, 'sample-garmin-us.csv'), 'utf-8');
    const result = smartParseCSV(csv);
    expect(result[0].best_1min).toBe(420);
    expect(result[0].best_5min).toBe(340);
    expect(result[0].best_20min).toBe(275);
  });

  it('handles escaped quotes inside quoted fields', () => {
    const csv = 'Date,Name,Distance\n2025-06-01,"Ride with ""power"" intervals",50';
    const result = smartParseCSV(csv);
    expect(result[0].title).toBe('Ride with "power" intervals');
  });

  it('returns empty for header-only CSV (no data rows)', () => {
    const csv = 'Date,Name,Distance';
    expect(smartParseCSV(csv)).toEqual([]);
  });

  it('parses max_altitude, max_power, and max_hr headers', () => {
    const csv = 'Date,Name,Distance,Max Altitude,Max Power,Max Heartrate\n2025-06-01,Test,50,2642,650,178';
    const result = smartParseCSV(csv);
    expect(result[0].max_altitude).toBe(2642);
    expect(result[0].max_power).toBe(650);
    expect(result[0].max_hr).toBe(178);
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
    expect(result[0].date).toBe('2025-06-15');
    expect(result[0].avg_power).toBe(218);
    expect(result[0].norm_power).toBe(245);
    expect(result[0].avg_hr).toBe(152);

    // Activity 1: uses start_date_local, average_watts, avg_hr
    expect(result[1].date).toBe('2025-06-16');
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
});