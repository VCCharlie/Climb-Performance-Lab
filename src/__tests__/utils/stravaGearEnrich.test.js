import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichActivityGearFromStrava, fetchStravaGearName } from '../../utils/stravaGearEnrich';

describe('fetchStravaGearName', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns name from gear API', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Canyon Ultimate' }),
    });
    const n = await fetchStravaGearName('g1', 'tok');
    expect(n).toBe('Canyon Ultimate');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/gear/g1'),
      expect.any(Object)
    );
  });
});

describe('enrichActivityGearFromStrava', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fills gear from activity detail when missing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gear_id: 'bike99',
        map: { summary_polyline: 'abc' },
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Tarmac' }),
    });

    const out = await enrichActivityGearFromStrava(
      { id: '1', strava_id: '555', title: 'Ride' },
      { id: 'strava_555', gear_id: null },
      'tok'
    );

    expect(out.gear_id).toBe('bike99');
    expect(out.gear_name).toBe('Tarmac');
    expect(out.strava_map).toBe('abc');
  });
});
