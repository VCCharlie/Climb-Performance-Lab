import { describe, it, expect } from 'vitest';
import { normalizeStravaActivityId, stravaActivityUrl, stravaFlybyUrl, openExternalUrl, openStravaFlyby, resolveFlybyStravaId } from '../../utils/strava';

describe('normalizeStravaActivityId', () => {
  it('strips non-digits when long enough', () => {
    expect(normalizeStravaActivityId(' 12345678 ')).toBe('12345678');
  });

  it('parses strava- prefix', () => {
    expect(normalizeStravaActivityId('strava-987654321')).toBe('987654321');
  });
});

describe('stravaActivityUrl', () => {
  it('builds Strava activity URL from numeric id', () => {
    expect(stravaActivityUrl('123456')).toBe('https://www.strava.com/activities/123456');
  });

  it('returns null when id is missing', () => {
    expect(stravaActivityUrl(null)).toBeNull();
  });
});

describe('stravaFlybyUrl', () => {
  it('builds Strava Flyby viewer URL from activity id only', () => {
    expect(stravaFlybyUrl('123456')).toBe('https://labs.strava.com/flyby/viewer/#123456');
  });

  it('uses id-only hash (no route polyline)', () => {
    const url = stravaFlybyUrl('123456');
    expect(url).not.toContain(',');
  });

  it('returns null when id is missing', () => {
    expect(stravaFlybyUrl('')).toBeNull();
  });
});

describe('resolveFlybyStravaId', () => {
  it('blocks intervals id stored as strava_id', () => {
    expect(resolveFlybyStravaId({ id: '53534754', strava_id: '53534754' })).toBeNull();
  });
});

describe('openStravaFlyby', () => {
  it('returns false when activity has no valid strava id', async () => {
    await expect(openStravaFlyby({ strava_id: null })).resolves.toBe(false);
  });
});

describe('openExternalUrl', () => {
  it('returns false for empty url', () => {
    expect(openExternalUrl('')).toBe(false);
    expect(openExternalUrl(null)).toBe(false);
  });
});
