import { describe, it, expect } from 'vitest';
import {
  buildStravaActivityIdToGearIdMap,
  pickActivitiesNeedingGearPatch,
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
