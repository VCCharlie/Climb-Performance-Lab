import { describe, it, expect } from 'vitest';
import { findBestClimbForActivityTitle, buildClimbMatchIndex, findBestClimbUsingIndex } from '../../utils/activityClimbMatch';

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
});
