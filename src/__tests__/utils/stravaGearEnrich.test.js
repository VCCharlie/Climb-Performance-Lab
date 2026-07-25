import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyStravaDetailFieldsToAlreadyLinkedMatch,
  buildAlreadyLinkedStravaUpdate,
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
        moving_time: '5400',
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
    expect(out.moving_time).toBe(5400);
  });

  it('forceStravaDetail still fetches detail when gear and kom summary already exist', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 555,
        gear_id: 'bike99',
        map: { summary_polyline: 'xyz' },
        moving_time: 3600,
        segment_efforts: [{ name: 'Seg A', pr_rank: 1, kom_rank: 2 }],
      }),
    });

    const out = await enrichActivityGearFromStrava(
      {
        id: '1',
        strava_id: '555',
        title: 'Ride',
        gear_id: 'bike99',
        gear_name: 'Tarmac',
        strava_map: 'old',
        strava_kom_summary: { label: 'PR', tooltip: 'x' },
      },
      null,
      'tok',
      { forceStravaDetail: true },
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/activities/555?include_all_efforts=true'),
      expect.any(Object),
    );
    expect(out.strava_kom_summary).not.toBeNull();
    expect(String(out.strava_kom_summary?.tooltip || '')).toContain('Seg A');
  });
});

describe('already-linked Strava enrichment helpers', () => {
  it('copies gear from detailed Strava activity when the list item omitted it', () => {
    const match = {
      site: { id: '10', rpe: 0, avg_hr: 0 },
      strava: { id: 999, name: 'Hill reps' },
    };

    const enriched = applyStravaDetailFieldsToAlreadyLinkedMatch(match, {
      gear_id: 'bike99',
      perceived_exertion: 7,
      average_heartrate: 149.4,
      max_heartrate: 181.2,
    });

    expect(enriched.needsGear).toBe(true);
    expect(enriched.strava.gear_id).toBe('bike99');
    expect(enriched.needsRpe).toBe(true);
    expect(enriched.needsHr).toBe(true);
  });

  it('builds a Firestore patch from detailed gear/RPE/HR data for already-linked rows', () => {
    const patch = buildAlreadyLinkedStravaUpdate(
      {
        site: { id: '10', rpe: 0, avg_hr: 0, max_hr: 0 },
        strava: {
          id: 999,
          name: 'Hill reps',
          gear_id: 'bike99',
          perceived_exertion: 7,
          average_heartrate: 149.4,
          max_heartrate: 181.2,
        },
      },
      { bike99: 'Tarmac SL8' },
    );

    expect(patch).toEqual({
      gear_id: 'bike99',
      gear_name: 'Tarmac SL8',
      title: 'Hill reps',
      rpe: 7,
      avg_hr: 149,
      max_hr: 181,
    });
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
        json: async () => ({
          gear_id: 'g1',
          map: { summary_polyline: 'poly1' },
          moving_time: 3600,
        }),
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
    expect(r.updates[0].data.moving_time).toBe(3600);
    expect(r.ridesProcessed).toBe(1);
  });

  it('patches moving_time from Strava when gear/map already set but duration was 0', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gear_id: 'g1',
        gear_name: 'Bike A',
        map: { summary_polyline: 'same' },
        moving_time: 7200,
      }),
    });

    const act = {
      id: '10',
      strava_id: '999',
      gear_id: 'g1',
      gear_name: 'Bike A',
      strava_map: 'same',
      moving_time: 0,
    };
    const r = await buildStravaDetailEnrichmentUpdates([act], 'tok');
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].data.moving_time).toBe(7200);
  });

  it('counts unchanged when local row already has gear, name, and map (no detail fetch)', async () => {
    const act = {
      id: '10',
      strava_id: '999',
      gear_id: 'g1',
      gear_name: 'Bike A',
      strava_map: 'same',
      moving_time: 3600,
      climbing: 1200,
      climbing_from_strava: true,
    };
    const r = await buildStravaDetailEnrichmentUpdates([act], 'tok');
    expect(r.updates).toHaveLength(0);
    expect(r.unchanged).toBe(1);
    expect(r.ridesProcessed).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches detail and patches distance when stored km is implausible vs duration', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gear_id: 'g1',
        map: { summary_polyline: 'same' },
        moving_time: 3600,
        distance: 760,
      }),
    });

    const act = {
      id: '10',
      strava_id: '999',
      gear_id: 'g1',
      gear_name: 'Bike A',
      strava_map: 'same',
      moving_time: 3600,
      distance: 772.5,
    };
    const r = await buildStravaDetailEnrichmentUpdates([act], 'tok');
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].data.distance).toBe(0.76);
  });

  it('updates climbing from Strava detail when Intervals elevation differs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gear_id: 'g1',
        map: { summary_polyline: 'same' },
        moving_time: 3600,
        total_elevation_gain: 812,
      }),
    });

    const act = {
      id: '10',
      strava_id: '999',
      gear_id: 'g1',
      gear_name: 'Bike A',
      strava_map: 'same',
      moving_time: 3600,
      climbing: 1200,
    };
    const r = await buildStravaDetailEnrichmentUpdates([act], 'tok');
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].data.climbing).toBe(812);
    expect(r.updates[0].data.climbing_from_strava).toBe(true);
  });
});
