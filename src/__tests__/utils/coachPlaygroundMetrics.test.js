import { describe, it, expect } from 'vitest';
import { formatPlaygroundAxisTick, roundExplorerValue } from '../../utils/coach/coachPlaygroundMetrics';

describe('formatPlaygroundAxisTick', () => {
  it('rounds float noise on hour ticks to one decimal', () => {
    expect(formatPlaygroundAxisTick(3.3699999999999999, { unit: 'h', decimals: 1 })).toBe('3.4');
    expect(formatPlaygroundAxisTick(17.369999999999997, { unit: 'h', decimals: 1 })).toBe('17.4');
  });

  it('formats whole numbers without trailing decimals', () => {
    expect(formatPlaygroundAxisTick(211.15, { decimals: 0 })).toBe('211');
    expect(formatPlaygroundAxisTick(10, { unit: 'h', decimals: 1 })).toBe('10');
  });

  it('roundExplorerValue still cleans stored values', () => {
    expect(roundExplorerValue(3.3699999999999999, { decimals: 1 })).toBe(3.4);
  });
});
