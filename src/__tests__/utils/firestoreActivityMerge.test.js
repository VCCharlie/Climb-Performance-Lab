import { describe, it, expect } from 'vitest';
import { protectEnrichedFieldsOnMerge } from '../../utils/firestoreActivityMerge';

describe('protectEnrichedFieldsOnMerge', () => {
    it('behoudt bestaande RPE als inkomend 0 is', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Ride', rpe: 0 },
            { id: '1', title: 'Ride', rpe: 7 }
        );
        expect(out.rpe).toBe(7);
    });

    it('overschrijft RPE als inkomend > 0', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Ride', rpe: 8 },
            { id: '1', title: 'Ride', rpe: 7 }
        );
        expect(out.rpe).toBe(8);
    });

    it('behoudt specifieke titel bij generieke Intervals-titel', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Morning Ride', rpe: 0 },
            { id: '1', title: 'Clubrit met pijn', rpe: 0 }
        );
        expect(out.title).toBe('Clubrit met pijn');
    });

    it('neemt betere inkomende titel als bestaande generiek is', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Zware cols', rpe: 0 },
            { id: '1', title: 'Morning Ride', rpe: 0 }
        );
        expect(out.title).toBe('Zware cols');
    });

  it('zonder bestaand document: geen wijziging', () => {
    const inc = { id: '1', title: 'Morning Ride', rpe: 0 };
    expect(protectEnrichedFieldsOnMerge(inc, null)).toEqual(inc);
  });

  it('keeps strava_id when Intervals payload has none', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', avg_power: 200 },
      { id: '1', strava_id: '12345678', strava_map: 'abc', gear_id: 'g1', gear_name: 'Bike' }
    );
    expect(out.strava_id).toBe('12345678');
    expect(out.strava_map).toBe('abc');
    expect(out.gear_id).toBe('g1');
    expect(out.gear_name).toBe('Bike');
  });

  it('keeps avg_hr when incoming is zero', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', avg_hr: 0 },
      { id: '1', avg_hr: 142, max_hr: 178 }
    );
    expect(out.avg_hr).toBe(142);
    expect(out.max_hr).toBe(178);
  });

  it('keeps strava_kom_summary when incoming omits it', () => {
    const kom = { label: 'PR · KOM#2', tooltip: 'Seg (PR, KOM#2)' };
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', load: 100 },
      { id: '1', strava_kom_summary: kom }
    );
    expect(out.strava_kom_summary).toEqual(kom);
  });

  it('protects Strava map-corrected climbing from Intervals overwrite', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', climbing: 1100, strava_id: '12345678' },
      {
        id: '1',
        strava_id: '12345678',
        climbing: 890,
        climbing_from_strava: true,
      }
    );
    expect(out.climbing).toBe(890);
    expect(out.climbing_from_strava).toBe(true);
  });

  it('protects manually corrected climbing from Intervals overwrite', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', climbing: 1100 },
      {
        id: '1',
        climbing: 920,
        climbing_user_corrected: true,
      },
    );
    expect(out.climbing).toBe(920);
    expect(out.climbing_user_corrected).toBe(true);
  });

  it('keeps stream decoupling summary when re-sync omits enriched fields', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Ride', norm_power: 180 },
      {
        id: '1',
        decoupling_pct: 6.2,
        decoupling_ef_first: 1.38,
        decoupling_ef_second: 1.29,
        decoupling_status: 'moderate',
        decoupling_source: 'intervals',
        decoupling_analyzed_at: '2026-08-10',
      },
    );
    expect(out.decoupling_pct).toBe(6.2);
    expect(out.decoupling_source).toBe('intervals');
    expect(out.decoupling_analyzed_at).toBe('2026-08-10');
  });

  it('keeps threshold drift summary when re-sync omits enriched fields', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '2', title: 'Threshold ride', norm_power: 220 },
      {
        id: '2',
        threshold_drift_pct: 8.4,
        threshold_drift_status: 'moderate',
        threshold_drift_source: 'strava',
        threshold_drift_analyzed_at: '2026-08-12',
      },
    );
    expect(out.threshold_drift_pct).toBe(8.4);
    expect(out.threshold_drift_source).toBe('strava');
  });

  it('keeps power zone times when re-sync omits enriched fields', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '3', title: 'Ride', norm_power: 190 },
      {
        id: '3',
        power_zone_sec: [300, 4200, 900, 0, 0, 0, 0],
        zone_times_source: 'intervals',
        zone_times_ftp: 260,
      },
    );
    expect(out.power_zone_sec[1]).toBe(4200);
    expect(out.zone_times_source).toBe('intervals');
    expect(out.zone_times_ftp).toBe(260);
  });

  it('protects Strava climbing while accepting new zone times from Intervals backfill', () => {
    const out = protectEnrichedFieldsOnMerge(
      {
        id: '4',
        title: 'Cols ride',
        climbing: 1100,
        power_zone_sec: [100, 5000, 800, 0, 0, 0, 0],
        zone_times_source: 'intervals',
        zone_times_ftp: 265,
      },
      {
        id: '4',
        climbing: 890,
        climbing_from_strava: true,
        strava_id: '99887766',
      },
    );
    expect(out.climbing).toBe(890);
    expect(out.climbing_from_strava).toBe(true);
    expect(out.power_zone_sec[1]).toBe(5000);
    expect(out.zone_times_ftp).toBe(265);
  });

  it('backfill: preserves Strava-enriched title, gear, type, and climbing over Intervals payload', () => {
    const existing = {
      id: 'i53534754',
      date: '2025-06-14',
      title: 'Race with friends — Col du Galibier',
      strava_id: '1234567890',
      strava_map: 'polyline',
      gear_id: 'g999',
      gear_name: 'Canyon Endurace CF SL',
      type: 'GravelRide',
      climbing: 1850,
      climbing_from_strava: true,
      avg_hr: 152,
    };
    const incoming = {
      id: 'i53534754',
      date: '2025-06-14',
      title: 'Evening Ride',
      gear_id: 'wahoo-profile',
      gear_name: 'Wahoo ELEMNT',
      type: 'Ride',
      climbing: 1420,
      norm_power: 228,
      load: 95,
      avg_hr: 0,
    };
    const out = protectEnrichedFieldsOnMerge(incoming, existing);
    expect(out.title).toBe('Race with friends — Col du Galibier');
    expect(out.gear_id).toBe('g999');
    expect(out.gear_name).toBe('Canyon Endurace CF SL');
    expect(out.type).toBe('GravelRide');
    expect(out.climbing).toBe(1850);
    expect(out.climbing_from_strava).toBe(true);
    expect(out.strava_id).toBe('1234567890');
    expect(out.strava_map).toBe('polyline');
    expect(out.avg_hr).toBe(152);
    expect(out.norm_power).toBe(228);
    expect(out.load).toBe(95);
  });

  it('backfill: preserves Strava climbing on linked rows without climbing_from_strava flag', () => {
    const out = protectEnrichedFieldsOnMerge(
      {
        id: 'i99',
        title: 'Evening Ride',
        climbing: 1100,
        type: 'Ride',
      },
      {
        id: 'i99',
        strava_id: '1234567890',
        title: 'Alpine loop',
        climbing: 890,
      },
    );
    expect(out.climbing).toBe(890);
    expect(out.title).toBe('Alpine loop');
    expect(out.type).toBe('Ride');
  });

  it('backfill: preserves custom title when incoming Intervals title is also specific', () => {
    const out = protectEnrichedFieldsOnMerge(
      {
        id: 'i88',
        title: 'Wahoo ELEMNT V2 — cols block',
        type: 'Ride',
        climbing: 1200,
      },
      {
        id: 'i88',
        strava_id: '1234567890',
        title: 'Race with friends — Galibier',
        type: 'GravelRide',
        climbing: 1850,
        climbing_from_strava: true,
      },
    );
    expect(out.title).toBe('Race with friends — Galibier');
    expect(out.type).toBe('GravelRide');
    expect(out.climbing).toBe(1850);
  });

  it('backfill: allows Intervals metrics while Strava-linked identity fields stay intact', () => {
    const existing = {
      id: 'i77',
      strava_id: '1234567890',
      title: 'Morning Ride',
      climbing: 400,
      gear_id: 'g1',
      gear_name: 'Road bike',
      type: 'VirtualRide',
    };
    const incoming = {
      id: 'i77',
      title: 'Morning Ride',
      climbing: 380,
      norm_power: 210,
      power_zone_sec: [0, 4200, 600, 0, 0, 0, 0],
      zone_times_source: 'intervals',
    };
    const out = protectEnrichedFieldsOnMerge(incoming, existing);
    expect(out.norm_power).toBe(210);
    expect(out.power_zone_sec[1]).toBe(4200);
    expect(out.gear_name).toBe('Road bike');
    expect(out.type).toBe('VirtualRide');
  });

  it('preserves user tags when incoming sync omits them', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Morning Ride' },
      { id: '1', tags: ['race', 'hilly'], user_notes: 'Felt good' },
    );
    expect(out.tags).toEqual(['race', 'hilly']);
    expect(out.user_notes).toBe('Felt good');
  });

  it('clears user tags when incoming explicitly sends an empty tags array', () => {
    const out = protectEnrichedFieldsOnMerge(
      { id: '1', title: 'Morning Ride', tags: [] },
      { id: '1', tags: ['race', 'hilly'] },
    );
    expect(out.tags).toEqual([]);
  });

  it('allows Strava enrich title to replace bike-computer profile name AETHOS', () => {
    const profiles = ['SUPERIOR', 'AETHOS'];
    const existing = {
      id: 'i1',
      strava_id: '1234567890',
      date: '2026-05-01',
      title: 'AETHOS',
    };
    const incoming = {
      id: 'i1',
      title: 'Long climb to the cols',
      strava_id: '1234567890',
    };
    const out = protectEnrichedFieldsOnMerge(incoming, existing, { deviceProfileTitles: profiles });
    expect(out.title).toBe('Long climb to the cols');
  });
});
