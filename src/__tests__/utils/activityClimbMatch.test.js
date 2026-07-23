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
});
