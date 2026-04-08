import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enrichActivityGearFromStrava,
  fetchStravaGearName,
  buildStravaDetailEnrichmentUpdates,
} from '../../utils/stravaGearEnrich';

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

describe('buildStravaDetailEnrichmentUpdates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns merge patches when Strava adds gear and map', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gear_id: 'g1', map: { summary_polyline: 'poly1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Bike A' }),
      });

    const r = await buildStravaDetailEnrichmentUpdates(
      [{ id: '10', strava_id: '999', title: 'Ride' }],
      'tok',
      { concurrency: 2 }
    );

    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].id).toBe('10');
    expect(r.updates[0].data.gear_id).toBe('g1');
    expect(r.updates[0].data.gear_name).toBe('Bike A');
    expect(r.updates[0].data.strava_map).toBe('poly1');
    expect(r.ridesProcessed).toBe(1);
  });

  it('counts unchanged when local row already has gear, name, and map (no detail fetch)', async () => {
    const act = {
      id: '10',
      strava_id: '999',
      gear_id: 'g1',
      gear_name: 'Bike A',
      strava_map: 'same',
    };
    const r = await buildStravaDetailEnrichmentUpdates([act], 'tok');
    expect(r.updates).toHaveLength(0);
    expect(r.unchanged).toBe(1);
    expect(r.ridesProcessed).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
