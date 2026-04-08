import { describe, it, expect } from 'vitest';
import { normalizeStravaActivityId } from '../../utils/strava';

describe('normalizeStravaActivityId', () => {
  it('strips non-digits when long enough', () => {
    expect(normalizeStravaActivityId(' 12345678 ')).toBe('12345678');
  });

  it('parses strava- prefix', () => {
    expect(normalizeStravaActivityId('strava-987654321')).toBe('987654321');
  });
});
