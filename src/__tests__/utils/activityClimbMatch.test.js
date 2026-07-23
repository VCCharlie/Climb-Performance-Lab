import { describe, it, expect } from 'vitest';
import {
    findBestClimbForActivityTitle,
    buildClimbMatchIndex,
    findBestClimbUsingIndex,
    findBestClimbForActivity,
    buildActivityClimbMatchText,
} from '../../utils/activityClimbMatch';

describe('findBestClimbForActivityTitle', () => {
  const climbs = [
    { id: 'a', name: 'Mont Ventoux' },
    { id: 'b', name: 'Coffee ride' },
  ];

  it('returns climb when name is substring of title', () => {
    expect(findBestClimbForActivityTitle('Morning Mont Ventoux from Malaucène', climbs)?.id).toBe('a');
  });

  it('returns null for unrelated title', () => {
    expect(findBestClimbForActivityTitle('Easy spin around town', climbs)).toBe(null);
  });

  it('index path matches single-title helper', () => {
    const idx = buildClimbMatchIndex(climbs);
    expect(findBestClimbUsingIndex('Morning Mont Ventoux from Malaucène', idx)?.id).toBe('a');
  });

  it('matches climb name in Strava description when title is generic', () => {
    const idx = buildClimbMatchIndex(climbs);
    const activity = {
      title: 'Morning ride',
      description: 'Cols climbed via MyCols: Mont Ventoux from Bedoin',
    };
    const { climb, source } = findBestClimbForActivity(activity, idx);
    expect(climb?.id).toBe('a');
    expect(source).toBe('description');
  });

  it('buildActivityClimbMatchText joins title and description', () => {
    const text = buildActivityClimbMatchText({
      title: 'Ride',
      description: 'Alpe d Huez',
    });
    expect(text).toContain('Ride');
    expect(text).toContain('Alpe');
  });

  it('routes virtual rides to Zwift climbs and outdoor rides to real climbs with the same name', () => {
    const climbs = [
      { id: 'fr_platzerwasel', name: 'Col du Platzerwasel', country: 'FR' },
      { id: 'zp_platzer', name: 'Col du Platzerwasel', country: 'ZWIFT' },
    ];
    const idx = buildClimbMatchIndex(climbs);

    const zwift = findBestClimbForActivity({
      type: 'VirtualRide',
      title: 'Zwift: Col du Platzerwasel',
    }, idx);
    expect(zwift.climb?.id).toBe('zp_platzer');

    const outdoor = findBestClimbForActivity({
      type: 'Ride',
      title: 'Col du Platzerwasel',
    }, idx);
    expect(outdoor.climb?.id).toBe('fr_platzerwasel');
  });

  it('ignores app-generated Similar to hints in description for matching', () => {
    const climbs = [{ id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR' }];
    const idx = buildClimbMatchIndex(climbs);
    const { climb, source } = findBestClimbForActivity({
      type: 'Ride',
      title: 'Morning ride',
      description: 'Similar to Alpe d Huez',
    }, idx);
    expect(climb).toBeNull();
    expect(source).toBeNull();
    expect(buildActivityClimbMatchText({
      title: 'Morning ride',
      description: 'Similar to Alpe d Huez',
    })).toBe('Morning ride');
  });
});
