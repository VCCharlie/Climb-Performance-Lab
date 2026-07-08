import { describe, it, expect } from 'vitest';
import { dateSpanFromActivities } from '../../utils/stravaSelectedEnrich';

describe('dateSpanFromActivities', () => {
  it('returns min and max ISO dates from activity rows', () => {
    expect(
      dateSpanFromActivities([
        { id: '1', date: '2024-06-15' },
        { id: '2', date: '2024-06-10T08:00:00' },
        { id: '3', date: '2024-06-20' },
      ]),
    ).toEqual({ start: '2024-06-10', end: '2024-06-20' });
  });

  it('returns null when no valid dates', () => {
    expect(dateSpanFromActivities([{ id: '1' }, { id: '2', date: '' }])).toBeNull();
    expect(dateSpanFromActivities([])).toBeNull();
  });
});
