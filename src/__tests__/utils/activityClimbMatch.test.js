import { describe, it, expect } from 'vitest';
import { findBestClimbForActivityTitle } from '../../utils/activityClimbMatch';

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
});
