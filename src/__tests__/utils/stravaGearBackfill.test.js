import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildStravaActivityIdToGearIdMap,
  pickActivitiesNeedingGearPatch,
  fetchStravaListUntilGearResolved,
} from '../../utils/stravaGearBackfill';

describe('buildStravaActivityIdToGearIdMap', () => {
  it('maps activity id to gear_id', () => {
    const m = buildStravaActivityIdToGearIdMap([
      { id: 111, gear_id: 'b1' },
      { id: 222, gear_id: null },
    ]);
    expect(m.get('111')).toBe('b1');
    expect(m.has('222')).toBe(false);
  });
});

describe('fetchStravaListUntilGearResolved', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops early when all required ids have gear', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, gear_id: 'a' },
        { id: 99, gear_id: 'b' },
      ],
    });
    const { list, map } = await fetchStravaListUntilGearResolved('tok', new Set(['99']), {
      maxPages: 10,
    });
    expect(map.get('99')).toBe('b');
    expect(list.length).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('pickActivitiesNeedingGearPatch', () => {
  it('selects linked activities without gear', () => {
    const map = new Map([['9', 'gx']]);
    const rows = pickActivitiesNeedingGearPatch(
      [
        { id: '1', strava_id: '9' },
        { id: '2', strava_id: '9', gear_id: 'gx' },
        { id: '3', strava_id: '8' },
      ],
      map
    );
    expect(rows).toEqual([{ id: '1', strava_id: '9', gear_id: 'gx' }]);
  });
});
